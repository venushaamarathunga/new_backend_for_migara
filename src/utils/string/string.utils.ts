export function generateRandomString(length?: number) {
    length = length || 8;
    let charCount = 0;
    const partials = [];
    while (charCount < length) {
        const str = Math.random()
            .toString(36)
            .substr(2);
        charCount += str.length;
        partials.push(str);
    }
    return partials.join('').substr(0, length);
}
