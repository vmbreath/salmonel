const fs = require('fs');
const readline = require('readline');

const split = s => {
    const result = [];
    let i = 0;
    i = s.indexOf(',', i)
    if (i === -1)
        return [s];
    let prev = 0;
    do {
        let sub = s.substring(prev, i).trim();
        if ((sub.startsWith('[') && !sub.endsWith(']')) || (sub.startsWith('{') && !sub.endsWith('}')) || (sub.startsWith('(') && !sub.endsWith(')')))
            continue;

        result.push(sub)
        prev = i + 1;
    } while ((i = s.indexOf(',', i + 1)) !== -1)

    let sub = s.substring(prev).trim();
    result.push(sub)
    return result;
}
exports.processLineByLine = async (path) => {
//async function processLineByLine() {
    const fileStream = fs.createReadStream('таблица.csv');
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    const data = [];
    for await (const line of rl) {
        data.push(line.split('\t'));
    }
    const data1 = data.map(function (element) {
        const elem = element[0].split(';');
        let arr = [
            elem[0],
            elem[1],
            split(elem[2]),
            split(elem[3]),
            split(elem[4]),
        ];
        return arr
    });
    let fileData;
    fileData = JSON.stringify(data1);
    console.log('data1',data1)
    fs.writeFile('Data.js', fileData, 'utf-8', () => {
    })

}


