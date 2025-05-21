import { S3 } from "@aws-sdk/client-s3";
import * as fs from "node:fs";
import * as zlib from 'node:zlib';

// Maintain process.env for CLI usage, but prioritize context.env if available
export const getR2Env = (context?: { env: Record<string, string> }) => {
	const envSource = context?.env ?? process.env;
	const bucketName = envSource.R2_BUCKET_NAME!;
	const accessKeyId = envSource.R2_ACCESS_KEY_ID!;
	const secretAccessKey = envSource.R2_SECRET_ACCESS_KEY!;
	const endpoint = envSource.R2_ENDPOINT!;

	if (!bucketName || !accessKeyId || !secretAccessKey || !endpoint) {
		throw new Error('Missing R2 environment variables');
	}

	return { accessKeyId, bucketName, endpoint, secretAccessKey };
};

// Creates a S3 client to interact with R2
export const getS3Client = (context?: { env: Record<string, string> }) => {
	const { accessKeyId, secretAccessKey, endpoint } = getR2Env(context);
	return new S3({
		credentials: {
			accessKeyId,
			secretAccessKey,
		},
		endpoint,
		forcePathStyle: true,
		region: 'auto',
	});
};

export const filesToUpload = [
	'src/assets/cards-full.json',
	'src/assets/jp-cards-full.json',
	'src/assets/prices.json',
]

export async function uploadFile(filePath: string, objectName: string, context?: { env: Record<string, string> }) {
	try {
		const s3 = getS3Client(context);
		const { bucketName } = getR2Env(context);
		// For Cloudflare Functions, fs operations are not directly available for project files.
		// The files need to be "generated" in memory or fetched if already in R2/KV.
		// This example assumes the scraper functions return the content or can write to a temp location accessible by the Function.
		// For now, we'll assume the scraper functions invoked before this will make the files available
		// in a way that can be read by fs.readFileSync. This needs to be true for Pages Functions.
		// If running in a Worker, fs.readFileSync will not work like this.
		const fileContent = fs.readFileSync(filePath);

		const compressedContent = zlib.gzipSync(fileContent);

		const compressedObjectName = `${objectName}.gz`;
		const uploadParams = {
			Body: compressedContent,
			Bucket: bucketName,
			CacheControl: 'public, max-age=86400', // 24 hours
			ContentEncoding: 'gzip',
			ContentType: "application/json",
			Key: compressedObjectName,
		};

		console.log(`Uploading ${compressedObjectName} to R2 bucket ${bucketName} with Cache-Control...`);
		await s3.putObject(uploadParams);
		console.log(`Successfully uploaded ${compressedObjectName} to R2`);
	} catch (error) {
		console.error(`Error uploading ${objectName}:`, error);
		throw error;
	}
}
