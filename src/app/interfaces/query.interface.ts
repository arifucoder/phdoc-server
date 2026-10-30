// raw req.query — Express-এর query parser string, array বা nested object দিতে পারে
export type IQueryParams = Record<string, unknown>;

export interface IQueryConfig {
	searchableFields?: readonly string[];
	filterableFields?: readonly string[];
	sortableFields?: readonly string[];
	selectableFields?: readonly string[];
	enumFields?: readonly string[]; // value auto UPPERCASE
	caseInsensitiveFields?: readonly string[]; // exact match, কিন্তু case ignore
	tieBreakerFields?: readonly string[]; // default ["id"] — composite key model-এ বদলাও
	defaultSortBy?: string;
	defaultLimit?: number;
	maxLimit?: number;
}

export interface IQueryMeta {
	page: number;
	limit: number;
	total: number;
	totalPages: number;
}

export interface IQueryResult<T> {
	data: T[];
	meta: IQueryMeta;
}

// যেকোনো Prisma model delegate (prisma.doctor, prisma.patient ...) এই shape মেনে চলে
export interface PrismaModelDelegate {
	// oxlint-disable-next-line typescript/no-explicit-any
	findMany(args?: any): Promise<unknown[]>;
	// oxlint-disable-next-line typescript/no-explicit-any
	count(args?: any): Promise<number>;
}
