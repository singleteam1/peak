export function excludeExtension(fileName: string) {
	const lastDotIndex = fileName.lastIndexOf('.');
	if (lastDotIndex <= 0) return fileName;
	return fileName.substring(0, lastDotIndex);
}
