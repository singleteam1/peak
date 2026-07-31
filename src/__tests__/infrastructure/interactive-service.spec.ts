import { select } from '@clack/prompts'; // Adjust path if using a different library
import {
	type IInteractiveService,
	Interactive,
	type TSingleSelectOptionProps,
	type TSingleSelectProps,
} from 'infrastructure';
import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, type Mock, vi } from 'vitest';

vi.mock('inquirer', () => ({
	default: {
		prompt: vi.fn(),
	},
}));

vi.mock('@clack/prompts', () => ({
	select: vi.fn(),
}));

describe('Interactive Service', () => {
	let interactive: IInteractiveService;

	beforeEach(() => {
		vi.clearAllMocks();
		interactive = new Interactive();
	});

	describe('confirmAction', () => {
		it('should return true when the user confirms', async () => {
			// Arrange
			const message = 'Do you want to proceed?';
			const initValue = true;
			(inquirer.prompt as unknown as Mock).mockResolvedValue({
				isSuccess: true,
			});

			// Act
			const result = await interactive.confirmAction(message, initValue);

			// Assert
			expect(inquirer.prompt).toHaveBeenCalledWith({
				type: 'confirm',
				name: 'isSuccess',
				message: message,
				default: initValue,
			});
			expect(result).toBe(true);
		});

		it('should return false when the user cancels', async () => {
			// Arrange
			(inquirer.prompt as unknown as Mock).mockResolvedValue({
				isSuccess: false,
			});

			// Act
			const result = await interactive.confirmAction('Delete?', false);

			// Assert
			expect(result).toBe(false);
		});
	});

	describe('singleSelect', () => {
		it('should correctly map options and return the selected value', async () => {
			// Arrange
			const props: TSingleSelectProps<string> = {
				message: 'Choose a template',
				options: [
					{ label: 'Clean Architecture', value: 'clean' },
					{ label: 'DDD', value: 'ddd' },
				],
				initValue: {
					label: 'Clean Architecture',
					value: 'clean',
				} as TSingleSelectOptionProps<string>,
			};

			(select as Mock).mockResolvedValue('ddd');

			// Act
			const result = await interactive.singleSelect(props);

			// Assert
			expect(select).toHaveBeenCalledWith({
				message: props.message,
				initialValue: props.initValue,
				options: [
					{ label: 'Clean Architecture', value: 'clean' },
					{ label: 'DDD', value: 'ddd' },
				],
			});
			expect(result).toBe('ddd');
		});

		it('should handle complex generic types in values', async () => {
			// 1. Define the raw value
			const complexValue = { id: 1, type: 'admin' };

			// 2. Define the initial option (matching TSingleSelectOptionProps)
			const initOption = { label: 'Admin', value: complexValue };

			const props: TSingleSelectProps<{ id: number; type: string }> = {
				message: 'Select User',
				options: [initOption],
				initValue: initOption, // Now this matches TSingleSelectOptionProps
			};

			// Mock the return value of the underlying 'select' function
			(select as Mock).mockResolvedValue(complexValue);

			// Act
			const result = await interactive.singleSelect(props);

			// Assert
			expect(result).toEqual(complexValue);
		});
	});
});
