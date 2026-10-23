export type TInputTextProps = {
	message: string;
	placeholder: string;
	initValue?: string;
	validate?: (v: string) => string | undefined;
};

export type TSingleSelectOptionProps<TVal> = {
	label: string;
	value: TVal;
};

export type TSingleSelectProps<TVal> = {
	message: string;
	options: TSingleSelectOptionProps<TVal>[];
	initValue?: TSingleSelectOptionProps<TVal>;
};
