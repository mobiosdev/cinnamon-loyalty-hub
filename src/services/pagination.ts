export interface PaginationMeta {
  total: number;
  page: number;
  currentPage: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: PaginationMeta;
}

export interface ListParams {
  page?: number;
  limit?: number;
  search?: string;
}

export const buildListQuery = (params: ListParams = {}) => {
  const queryParams = new URLSearchParams();
  if (params.page) queryParams.append('page', params.page.toString());
  if (params.limit) queryParams.append('limit', params.limit.toString());
  if (params.search?.trim()) queryParams.append('search', params.search.trim());
  const query = queryParams.toString();
  return query ? `?${query}` : '';
};
