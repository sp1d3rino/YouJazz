#!/bin/bash

# Controlla se è stato fornito un parametro
if [ $# -eq 0 ]; then
    echo "Uso: $0 <directory>"
    exit 1
fi

# Salva la directory fornita come parametro
DIR="$1"

# Controlla se la directory esiste
if [ ! -d "$DIR" ]; then
    echo "Errore: '$DIR' non è una directory valida"
    exit 1
fi

# Itera sui file .wav nella directory specificata
for f in "$DIR"/*.wav; do
    # Controlla se esistono file .wav
    if [ ! -e "$f" ]; then
        echo "Nessun file .wav trovato in $DIR"
        break
    fi
    
    # Estrae il nome base del file senza estensione
    base=$(basename "$f" .wav)
    
    # Converte il file
    echo "Conversione di: $base.wav"
    ffmpeg -i "$f" -codec:a libmp3lame -b:a 192k -ar 48000 -ac 1 "$DIR/$base.mp3" 2>/dev/null
done

echo "Mp3 converted!"

./renamer.sh "$DIR"
./make-diesis.sh "$DIR"

rm "$DIR"/*.wav


