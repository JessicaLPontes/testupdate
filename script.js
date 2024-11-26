function handleFiles(event) {
    const files = event.target.files;
    const sqlLinksContainer = document.getElementById('sql-links');
    sqlLinksContainer.innerHTML = '';

    // Adiciona animação de processamento
    const processingMsg = document.createElement('p');
    processingMsg.innerText = 'Processando arquivos...';
    sqlLinksContainer.appendChild(processingMsg);

    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const reader = new FileReader();

        reader.onload = function (event) {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });

                workbook.SheetNames.forEach(sheetName => {
                    const sheet = workbook.Sheets[sheetName];
                    const tableName = sheetName.replace(/\s+/g, '_');
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { raw: false });
                    const columns = Object.keys(jsonData[0]);

                    // Bloco de comandos INSERT
                    const insertSQL = jsonData.map(row => {
                        const values = columns.map(column => {
                            let value = row[column];
                            if (value === '' || typeof value === 'undefined') {
                                return 'NULL';
                            } else {
                                let cleanedValue = typeof value === 'string' ? value.replace(/&nbsp;/g, '').trim() : value;
                                cleanedValue = cleanedValue.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos
                                return typeof cleanedValue === 'string' ? `'${cleanedValue.replace(/'/g, "''")}'` : `'${cleanedValue}'`;
                            }
                        }).join(', ');
                        return `INSERT INTO ${tableName} (${columns.join(', ')}) VALUES (${values});`;
                    }).join('\n');

                    // Bloco de comandos UPDATE
                    const updateSQL = jsonData.map(row => {
                        const updateStatements = columns.map(column => {
                            let value = row[column];
                            if (value === '' || typeof value === 'undefined') {
                                return `${column} = NULL`;
                            } else {
                                let cleanedValue = typeof value === 'string' ? value.replace(/&nbsp;/g, '').trim() : value;
                                cleanedValue = cleanedValue.normalize("NFD").replace(/[\u0300-\u036f]/g, ""); // Remove acentos
                                return `${column} = '${cleanedValue.replace(/'/g, "''")}'`;
                            }
                        }).join(', ');

                        // Supõe que a primeira coluna é a chave de identificação
                        const primaryKeyColumn = columns[0];
                        const primaryKeyValue = row[primaryKeyColumn];
                        const cleanedPrimaryKey = primaryKeyValue
                            ? `'${primaryKeyValue.toString().replace(/'/g, "''")}'`
                            : 'NULL';

                        return `UPDATE ${tableName} SET ${updateStatements} WHERE ${primaryKeyColumn} = ${cleanedPrimaryKey};`;
                    }).join('\n');

                    // Cria arquivos SQL separados
                    const insertBlob = new Blob([insertSQL], { type: 'text/plain' });
                    const insertLink = document.createElement('a');
                    insertLink.href = window.URL.createObjectURL(insertBlob);
                    insertLink.download = `${tableName}_insert.sql`;
                    insertLink.innerText = `Download ${tableName}_insert.sql`;
                    insertLink.classList.add('sql-link');
                    sqlLinksContainer.appendChild(insertLink);

                    const updateBlob = new Blob([updateSQL], { type: 'text/plain' });
                    const updateLink = document.createElement('a');
                    updateLink.href = window.URL.createObjectURL(updateBlob);
                    updateLink.download = `${tableName}_update.sql`;
                    updateLink.innerText = `Download ${tableName}_update.sql`;
                    updateLink.classList.add('sql-link');
                    sqlLinksContainer.appendChild(updateLink);
                });

                // Remove a animação após o processamento
                sqlLinksContainer.removeChild(processingMsg);
            } catch (error) {
                console.error('Erro ao processar arquivo:', error);
                // Adiciona mensagem de erro destacada
                const errorMsg = document.createElement('p');
                errorMsg.innerText = `Erro ao processar ${file.name}`;
                errorMsg.classList.add('error');
                sqlLinksContainer.appendChild(errorMsg);

                // Remove a animação em caso de erro
                sqlLinksContainer.removeChild(processingMsg);
            }
        };

        reader.readAsArrayBuffer(file);
    }
}

function clearFiles() {
    // Limpa a entrada de arquivo e os links SQL
    const fileInput = document.getElementById('file-input');
    fileInput.value = '';
    const sqlLinksContainer = document.getElementById('sql-links');
    sqlLinksContainer.innerHTML = '';
}
