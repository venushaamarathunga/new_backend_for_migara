import Pagination from './Pagination';

export default class PageResponse<T> {
    public pagination: Pagination;
    public data: T[];
    constructor(pages: number, pageSizes: number, totalElement: number, data: T[]) {
        this.data = data;
        this.pagination = new Pagination(pages, pageSizes, totalElement);
    }
}
