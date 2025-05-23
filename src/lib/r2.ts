import { S3, PutObjectCommand, type PutObjectCommandInput } from '@aws-sdk/client-s3';
import pako from 'pako';

export interface R2Env {
	accessKeyId: string;
	bucketName: string;
	endpoint: string;
	secretAccessKey: string;
}

export const getR2Env = (envSource: Record<string, any>): R2Env => {
	const bucketName = envSource.R2_BUCKET_NAME as string;
	const accessKeyId = envSource.R2_ACCESS_KEY_ID as string;
	const secretAccessKey = envSource.R2_SECRET_ACCESS_KEY as string;
	const endpoint = envSource.R2_ENDPOINT as string;

	if (!bucketName || !accessKeyId || !secretAccessKey || !endpoint) {
		throw new Error('Missing R2 environment variables');
	}

	return { accessKeyId, bucketName, endpoint, secretAccessKey };
};

export const getS3Client = (r2Env: R2Env): S3 => {
	return new S3({
		credentials: {
			accessKeyId: r2Env.accessKeyId,
			secretAccessKey: r2Env.secretAccessKey,
		},
		endpoint: r2Env.endpoint,
		forcePathStyle: true,
		region: 'auto',
	});
};

interface UploadBufferToR2Params {
	s3Client: S3;
	bucketName: string;
	objectName: string;
	contentBuffer: Buffer;
	contentType?: string;
	cacheControl?: string;
	contentEncoding?: string;
}

export async function uploadBufferToR2({
	s3Client,
	bucketName,
	objectName,
	contentBuffer,
	contentType = 'application/octet-stream',
	cacheControl = 'public, max-age=86400', // 24 hours
	contentEncoding
}: UploadBufferToR2Params): Promise<void> {
	let finalObjectName = objectName.endsWith('.gz') ? objectName : `${objectName}.gz`;
	try {
		const gzippedBuffer = pako.gzip(contentBuffer);

		const uploadParams: PutObjectCommandInput = {
			Body: gzippedBuffer,
			Bucket: bucketName,
			CacheControl: cacheControl,
			ContentType: contentType,
			Key: finalObjectName,
		};

		if (contentEncoding) {
			uploadParams.ContentEncoding = contentEncoding;
		} else if (finalObjectName.endsWith('.gz')) {
			uploadParams.ContentEncoding = 'gzip';
		}

		console.log(`Uploading ${finalObjectName} to R2 bucket ${bucketName} (size: ${gzippedBuffer.length} bytes) with ContentType: ${contentType}${uploadParams.ContentEncoding ? ', ContentEncoding: ' + uploadParams.ContentEncoding : ''}...`);
		await s3Client.send(new PutObjectCommand(uploadParams));
		console.log(`Successfully uploaded ${finalObjectName} to R2`);
	} catch (error) {
		console.error(`Error uploading ${finalObjectName} to R2:`, error);
		throw error;
	}
}
