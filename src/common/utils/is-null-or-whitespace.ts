export const isNullOrWhiteSpace = (value?: string | null): boolean => {
	if (typeof value !== 'string') {
		return true;
	}
	if (!value) {
		return true;
	}
	return value.trim().length === 0;
};
