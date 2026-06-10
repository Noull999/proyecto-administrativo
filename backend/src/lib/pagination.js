export function parsePagination(query) {
  const page = Math.max(1, parseInt(query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(query.limit) || 20));
  return { skip: (page - 1) * limit, take: limit, page, limit };
}

export function paginatedResponse(data, total, page, limit) {
  return {
    data,
    pagination: { total, page, limit, pages: Math.ceil(total / limit) },
  };
}
