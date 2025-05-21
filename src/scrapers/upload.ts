import * as fs from 'node:fs';
import { getR2Env, getS3Client, uploadBufferToR2 } from '~/lib/r2'; // Use SvelteKit alias

export const filesToUpload = [
	'src/assets/cards-full.json',
	'src/assets/jp-cards-full.json',
	'src/assets/prices.json',
];

/**
 * Uploads a file or string content to R2. This function is intended for CLI usage
 * where Node.js APIs like 'fs' are available.
 * If filePathOrContent is a string that is not a file path, it's treated as direct content.
 */
export async function uploadFileForCli(filePathOrContent: string, objectName: string, context?: { env: Record<string, any>; contentType?: string }) {
	try {
		const envSource = context?.env ?? process.env;
		const r2Env = getR2Env(envSource);
		const s3Client = getS3Client(r2Env);

		let contentBuffer: Buffer;

		// Check if filePathOrContent is a path or direct content
		// This simple check assumes if fs.existsSync is true, it's a file path.
		// Otherwise, it's direct content.
		try {
			fs.accessSync(filePathOrContent, fs.constants.F_OK); // Check if path exists and is accessible
			console.log(`Treating input as file path: ${filePathOrContent}`);
			contentBuffer = fs.readFileSync(filePathOrContent);
		} catch (e) {
			// If accessSync throws, it's not a valid path or not accessible, treat as content
			console.log(`Treating input as direct content for object: ${objectName}`);
			contentBuffer = Buffer.from(filePathOrContent, 'utf-8');
		}

		await uploadBufferToR2({
			s3Client,
			bucketName: r2Env.bucketName,
			objectName,
			contentBuffer,
			contentType: context?.contentType,
		});

	} catch (error) {
		console.error(`Error in uploadFileForCli for ${objectName}:`, error);
		throw error;
	}
}

// Renaming the old uploadFile to avoid conflict if it's directly imported elsewhere unexpectedly.
// The primary export for CLI should be uploadFileForCli.
// If the API endpoint was the only user of the old `uploadFile` which passed content directly,
// then this distinction becomes cleaner.
export const deprecated_uploadFile_with_fs_and_zlib = async (filePathOrContent: string, objectName: string, context?: { env: Record<string, string>; contentType?: string }) => {
    // Original implementation that used fs and zlib can be kept here if needed for other specific CLI tasks
    // or removed if uploadFileForCli covers all CLI needs.
    // For now, let's assume it might be removed or refactored if no longer directly used by CLI in this exact form.
    throw new Error('deprecated_uploadFile_with_fs_and_zlib is not meant for direct use anymore. Use uploadFileForCli for CLI operations.');
};
