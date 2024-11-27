function handleInsertFiles(event) {
    processFiles(event, 'INSERT');
}

function handleUpdateFiles(event) {
    processFiles(event, 'UPDATE');
}

function processFiles(event, mode) {
    const files = event.target.files;
    const sqlLinksContainer = document.getElementById('sql-links');
    sqlLinksContainer.innerHTML = '';

    const processingMsg = document.createElement('p');
    processingMsg.innerText = `Processando arquivos para ${mode}...`;
    sqlLinksContainer.appendChild(processingMsg);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = function(event) {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const tableName = sheetName.replace(/\s+/g, '_');
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false });
                    const columns = Object.keys(jsonData[0]);

                    const sqlCommands = jsonData.map(row => {
                        const values = columns.map(column => {
                            const value = row[column];
                            return value === undefined || value === '' ? 'NULL' : `'${value.toString().replace(/'/g, "''")}'`;
                        }).join(', ');

                        if (mode === 'INSERT') {
                            return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});`;
                        } else if (mode === 'UPDATE') {
                            const setClauses = columns.map(column => `${column} = ${values}`).join(', ');
                            return `UPDATE ${tableName} SET ${setClauses} WHERE /* Condição */;`;
                        }
                    }).join('\n');

                    const blob = new Blob([sqlCommands], { type: 'text/plain' });
                    const link = document.createElement('a');
                    link.href = URL.createObjectURL(blob);
                    link.download = `${tableName}_${mode}.sql`;
                    link.innerText = `Download ${tableName}_${mode}.sql`;
                    link.classList.add('sql-link');
                    sqlLinksContainer.appendChild(link);
                });

                sqlLinksContainer.removeChild(processingMsg);
            } catch (error) {
                console.error(`Erro ao processar arquivo para ${mode}:`, error);
                sqlLinksContainer.removeChild(processingMsg);
            }
        };

        reader.readAsArrayBuffer(file);
    }
}

function clearFiles() {
    document.getElementById('insert-input').value = '';
    document.getElementById('update-input').value = '';
    document.getElementById('sql-links').innerHTML = '';
}
