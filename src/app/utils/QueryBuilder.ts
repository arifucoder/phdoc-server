import type { IQueryConfig, IQueryParams, IQueryResult, PrismaModelDelegate } from "@/app/interfaces/query.interface";

type AnyObject = Record<string, unknown>;

const ALLOWED_OPERATORS = new Set([
	"equals",
	"not",
	"lt",
	"lte",
	"gt",
	"gte",
	"in",
	"notIn",
	"contains",
	"startsWith",
	"endsWith",
]);
const STRING_OPERATORS = new Set(["contains", "startsWith", "endsWith"]);

const isPlainObject = (value: unknown): value is AnyObject =>
	typeof value === "object" && value !== null && !Array.isArray(value);

const toPositiveInt = (value: unknown, fallback: number): number => {
	const num = Math.floor(Number(value));
	return Number.isFinite(num) && num > 0 ? num : fallback;
};

/**
 * "name"                         -> { name: leaf }
 * "user.email"                   -> { user: { email: leaf } }                         (to-one)
 * "specialties.specialty.title"  -> { specialties: { some: { specialty: { title: leaf } } } } (to-many)
 */
const toNested = (path: string, leaf: unknown, useSome = true): AnyObject => {
	const parts = path.split(".");

	return parts.reduceRight<unknown>((node, key, index) => {
		const wrapSome = useSome && index === 0 && parts.length === 3;
		return { [key]: wrapSome ? { some: node } : node };
	}, leaf) as AnyObject;
};

export class QueryBuilder<T, TWhere = AnyObject, TInclude = AnyObject> {
	private conditions: AnyObject[] = [];
	private orderBy: AnyObject[] = [];
	private includeArgs: AnyObject = {};
	private selectArgs: Record<string, true> | undefined;
	private page = 1;
	private limit: number;

	constructor(
		private readonly model: PrismaModelDelegate,
		private readonly queryParams: IQueryParams,
		private readonly config: IQueryConfig = {},
	) {
		this.limit = config.defaultLimit ?? 10;
	}

	// ?searchTerm=john
	search(): this {
		const term = this.getString("searchTerm")?.trim();
		const { searchableFields = [] } = this.config;

		if (!term || searchableFields.length === 0) return this;

		this.conditions.push({
			OR: searchableFields.map((field) => toNested(field, { contains: term, mode: "insensitive" })),
		});

		return this;
	}

	// ?gender=male&specialties.specialty.title=cardiology
	filter(): this {
		const { filterableFields = [], enumFields = [], caseInsensitiveFields = [] } = this.config;

		// শুধু whitelist-এ থাকা field-ই দেখি — বাকি সব query key auto-ignore
		for (const field of filterableFields) {
			const raw = this.queryParams[field];
			if (raw === undefined || raw === "") continue;

			let value = this.parseValue(raw);
			if (value === undefined) continue;

			if (enumFields.includes(field)) {
				value = this.toUpperDeep(value); // male -> MALE
			} else if (caseInsensitiveFields.includes(field) && typeof value === "string") {
				value = { equals: value, mode: "insensitive" }; // cardiology == Cardiology
			}

			this.conditions.push(toNested(field, value));
		}

		return this;
	}

	// ?sortBy=appointmentFee&sortOrder=asc
	// ?sortBy=appointmentFee&sortOrder=asc
	sort(): this {
		const { sortableFields = [], defaultSortBy = "createdAt", tieBreakerFields = ["id"] } = this.config;
		const requested = this.getString("sortBy");

		const sortBy = requested && sortableFields.includes(requested) ? requested : defaultSortBy;
		const sortOrder = this.getString("sortOrder")?.toLowerCase() === "asc" ? "asc" : "desc";

		// tie-breaker: একই value-ওয়ালা row page বদলালে duplicate/miss হবে না
		this.orderBy = [toNested(sortBy, sortOrder, false)];
		for (const field of tieBreakerFields) {
			if (field !== sortBy) this.orderBy.push({ [field]: sortOrder });
		}

		return this;
	}

	// ?page=2&limit=20
	paginate(): this {
		const { defaultLimit = 10, maxLimit = 100 } = this.config;

		this.page = toPositiveInt(this.getString("page"), 1);
		this.limit = Math.min(toPositiveInt(this.getString("limit"), defaultLimit), maxLimit);

		return this;
	}

	// ?fields=name,email,appointmentFee
	fields(): this {
		const raw = this.getString("fields");
		const { selectableFields = [] } = this.config;

		if (!raw) return this;

		const picked = raw
			.split(",")
			.map((field) => field.trim())
			.filter((field) => selectableFields.includes(field));

		if (picked.length > 0) {
			this.selectArgs = Object.fromEntries(picked.map((field) => [field, true as const]));
		}

		return this;
	}

	// code থেকে fixed include
	include(relations: TInclude): this {
		this.includeArgs = { ...this.includeArgs, ...(relations as AnyObject) };
		return this;
	}

	// ?include=user,specialties — শুধু includeConfig-এ থাকা relation allowed
	dynamicInclude(includeConfig: AnyObject, defaultInclude: readonly string[] = []): this {
		const requested =
			this.getString("include")
				?.split(",")
				.map((r) => r.trim()) ?? [];

		for (const relation of [...defaultInclude, ...requested]) {
			if (includeConfig[relation]) this.includeArgs[relation] = includeConfig[relation];
		}

		return this;
	}

	// code থেকে fixed condition, যেমন { isDeleted: false }
	where(condition: TWhere): this {
		this.conditions.push(condition as AnyObject);
		return this;
	}

	async execute(): Promise<IQueryResult<T>> {
		const where = this.buildWhere();

		// select আর include একসাথে Prisma নেয় না — fields দিলে select জিতবে
		const shape = this.selectArgs
			? { select: this.selectArgs }
			: Object.keys(this.includeArgs).length > 0
				? { include: this.includeArgs }
				: {};

		const [data, total] = await Promise.all([
			this.model.findMany({
				where,
				orderBy: this.orderBy.length > 0 ? this.orderBy : undefined,
				skip: (this.page - 1) * this.limit,
				take: this.limit,
				...shape,
			}),
			this.model.count({ where }),
		]);

		return {
			data: data as T[],
			meta: {
				page: this.page,
				limit: this.limit,
				total,
				totalPages: Math.ceil(total / this.limit),
			},
		};
	}

	// ---------- helpers ----------

	private buildWhere(): AnyObject {
		return this.conditions.length > 0 ? { AND: this.conditions } : {};
	}

	private getString(key: string): string | undefined {
		const value = this.queryParams[key];
		return typeof value === "string" ? value : undefined;
	}

	private parseValue(value: unknown): unknown {
		if (Array.isArray(value)) return { in: value.map((v) => this.parseScalar(v)) };
		if (isPlainObject(value)) return this.parseOperators(value);
		return this.parseScalar(value);
	}

	// "male" -> "MALE", { in: ["male"] } -> { in: ["MALE"] }
	private toUpperDeep(value: unknown): unknown {
		if (typeof value === "string") return value.toUpperCase();
		if (Array.isArray(value)) return value.map((v) => this.toUpperDeep(v));
		if (isPlainObject(value)) {
			return Object.fromEntries(Object.entries(value).map(([key, v]) => [key, this.toUpperDeep(v)]));
		}
		return value;
	}

	private parseScalar(value: unknown): unknown {
		if (value === "true") return true;
		if (value === "false") return false;
		if (typeof value === "string" && value.trim() !== "" && !Number.isNaN(Number(value))) {
			return Number(value);
		}
		return value;
	}

	// { gte: "500", lt: "1000", hack: "x" } -> { gte: 500, lt: 1000 }
	private parseOperators(obj: AnyObject): AnyObject | undefined {
		const result: AnyObject = {};

		for (const [operator, raw] of Object.entries(obj)) {
			if (!ALLOWED_OPERATORS.has(operator)) continue;

			if (operator === "in" || operator === "notIn") {
				result[operator] = (Array.isArray(raw) ? raw : [raw]).map((v) => this.parseScalar(v));
			} else if (STRING_OPERATORS.has(operator)) {
				result[operator] = String(raw);
				result.mode = "insensitive";
			} else {
				result[operator] = this.parseScalar(raw);
			}
		}

		return Object.keys(result).length > 0 ? result : undefined;
	}
}
