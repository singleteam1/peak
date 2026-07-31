import chalk from 'chalk';

export const outputColors = {
	accent: '#2d8ff7',
	danger: '#de554b',
	placeholder: '#c9c9c9',
	cliTarget: '#5cf7c3',
	command: '#5ee043',
	params: '#8f8f8f',
	features: '#8b62fc',
	warn: '#f2b750',
	success: '#65d683',
	muted: '#8A8FA3',
	white: '#ffffff',
} as const;

export const accent = chalk.hex(outputColors.accent);
export const danger = chalk.hex(outputColors.danger);
export const placeholder = chalk.hex(outputColors.placeholder);
export const cliTarget = chalk.hex(outputColors.cliTarget);
export const lime = chalk.hex(outputColors.command);
export const params = chalk.hex(outputColors.params);
export const features = chalk.hex(outputColors.features);
export const warn = chalk.hex(outputColors.warn);
export const success = chalk.hex(outputColors.success);
export const muted = chalk.hex(outputColors.muted);
export const white = chalk.hex(outputColors.white);
