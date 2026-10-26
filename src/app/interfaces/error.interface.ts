export interface TErrorSources {
	path: string;
	message: string;
}

// handleZodError-এর মতো helper এটা return করবে
export interface TGenericErrorResponse {
	statusCode: number;
	message: string;
	errorSources: TErrorSources[];
}

// client-এর কাছে যা যাবে
export interface TErrorResponse {
	success: false;
	message: string;
	errorSources: TErrorSources[];
	error?: unknown;
	stack?: string;
}
