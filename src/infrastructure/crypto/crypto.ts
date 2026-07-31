import keygen from 'keygen';

export interface ICryptoService {
	generateKey61(): string;
}

export class CryptoService implements ICryptoService {
	public generateKey61(): string {
		return keygen.url(61);
	}
}
