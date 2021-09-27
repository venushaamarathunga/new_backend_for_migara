export default class Pagination {
    public page: number;
    public pageSize: number;
    public totalElements: number;
    public totalPages: number;

    constructor(page: number, pageSize: number, totalElements: number) {
        this.page = page;
        this.pageSize = pageSize;
        this.totalElements = totalElements;
        this.totalPages = Math.ceil(totalElements / pageSize);
    }
}
