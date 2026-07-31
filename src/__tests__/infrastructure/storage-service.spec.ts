import fs from 'node:fs';
import path from 'node:path';
import { finished } from 'node:stream/promises';
import axios from 'axios';
import { type IStorageService, StorageService } from 'infrastructure';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

// Mock the modules
vi.mock('node:fs');
vi.mock('node:path');
vi.mock('axios');
vi.mock('node:stream/promises');

describe('Storage Service', () => {
	let service: IStorageService;
	const mockUrl = 'https://example.com/file.zip';
	const mockDest = '/downloads/file.zip';
	const mockDir = '/downloads';

	beforeEach(() => {
		vi.clearAllMocks();
		service = new StorageService();

		(path.dirname as Mock).mockReturnValue(mockDir);
	});

	it('Should create the directory if it does not exist and download the file', async () => {
		(fs.existsSync as Mock).mockReturnValue(false);
		const mockWriter = { pipe: vi.fn(), close: vi.fn() };
		(fs.createWriteStream as Mock).mockReturnValue(mockWriter);

		const mockResponse = {
			data: { pipe: vi.fn() },
		};
		(axios as unknown as Mock).mockResolvedValue(mockResponse);
		(finished as Mock).mockResolvedValue(undefined);

		await service.downloadFile(mockUrl, mockDest);

		expect(fs.mkdirSync).toHaveBeenCalledWith(mockDir, { recursive: true });
		expect(axios).toHaveBeenCalledWith(
			expect.objectContaining({
				url: mockUrl,
				method: 'get',
				responseType: 'stream',
			}),
		);
		expect(mockResponse.data.pipe).toHaveBeenCalledWith(mockWriter);
		expect(finished).toHaveBeenCalledWith(mockWriter);
	});

	it('Should not create the directory if it already exists', async () => {
		(fs.existsSync as Mock).mockReturnValue(true);
		(axios as unknown as Mock).mockResolvedValue({ data: { pipe: vi.fn() } });

		await service.downloadFile(mockUrl, mockDest);

		expect(fs.mkdirSync).not.toHaveBeenCalled();
	});

	it('Should cleanup and throw an error if the download fails', async () => {
		const mockError = new Error('Network Error');
		(axios as unknown as Mock).mockRejectedValue(mockError);

		const mockWriter = { close: vi.fn() };
		(fs.createWriteStream as Mock).mockReturnValue(mockWriter);

		(fs.existsSync as Mock).mockReturnValue(true);

		await expect(service.downloadFile(mockUrl, mockDest)).rejects.toThrow(
			'Failed to download file: Network Error',
		);

		expect(mockWriter.close).toHaveBeenCalled();
		expect(fs.unlinkSync).toHaveBeenCalledWith(mockDest);
	});

	it('Should throw an "Unknown error" if the caught error is not an instance of Error', async () => {
		(axios as unknown as Mock).mockRejectedValue('Something went wrong');
		(fs.createWriteStream as Mock).mockReturnValue({ close: vi.fn() });

		await expect(service.downloadFile(mockUrl, mockDest)).rejects.toThrow(
			'Failed to download file: Unknown error',
		);
	});
});
