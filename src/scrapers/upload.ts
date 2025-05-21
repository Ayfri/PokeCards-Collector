import { S3 } from "@aws-sdk/client-s3";
import * as fs from "node:fs";
import * as zlib from 'node:zlib';

const bucketName = process.env.R2_BUCKET_NAME!;
const accessKeyId = process.env.R2_ACCESS_KEY_ID!;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY!;
const endpoint = process.env.R2_ENDPOINT!;

// Creates a S3 client to interact with R2
const s3 = new S3({
	credentials: {
		accessKeyId,
		secretAccessKey,
	},
	endpoint,
	forcePathStyle: true,
	region: "auto",
});

export const filesToUpload = [
	'src/assets/cards-full.json',
	'src/assets/jp-cards-full.json',
	'src/assets/prices.json',
]

export async function uploadFile(filePath: string, objectName: string) {
	try {
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
