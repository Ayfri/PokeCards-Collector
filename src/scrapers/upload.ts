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

export async function uploadFile(filePathOrContent: string, objectName: string, context?: { env: Record<string, string>; contentType?: string }) {
	try {
		const s3 = getS3Client(context);
		const { bucketName } = getR2Env(context);

		let fileContent: Buffer;
		// Check if filePathOrContent is a path (heuristic: check for slashes or typical file extensions)
		// This is a simplification; a more robust check might be needed depending on expected inputs.
		if (filePathOrContent.includes('/') || filePathOrContent.includes('\\') || filePathOrContent.endsWith('.json') || filePathOrContent.endsWith('.txt')) {
			console.log(`Treating input as file path: ${filePathOrContent}`);
			// This part will likely fail in a pure serverless environment if filePathOrContent is a path not in /tmp
			try {
				fileContent = fs.readFileSync(filePathOrContent);
			} catch (readError) {
				console.error(`Failed to read file at path: ${filePathOrContent}. If this is content, ensure it does not resemble a file path.`);
				throw readError;
			}
		} else {
			console.log(`Treating input as direct content for object: ${objectName}`);
			fileContent = Buffer.from(filePathOrContent, 'utf-8');
		}

		const compressedContent = zlib.gzipSync(fileContent);

		const compressedObjectName = `${objectName}.gz`;
		const uploadParams = {
			Body: compressedContent,
			Bucket: bucketName,
			CacheControl: 'public, max-age=86400', // 24 hours
			ContentEncoding: 'gzip',
			ContentType: context?.contentType || "application/octet-stream", // Default if not specified
			Key: compressedObjectName,
		};

		console.log(`Uploading ${compressedObjectName} to R2 bucket ${bucketName} with Cache-Control and ContentType: ${uploadParams.ContentType}...`);
		await s3.putObject(uploadParams);
		console.log(`Successfully uploaded ${compressedObjectName} to R2`);
	} catch (error) {
		console.error(`Error uploading ${objectName}:`, error);
		throw error;
	}
}
