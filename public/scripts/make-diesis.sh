#!/bin/bash

# Script per creare versioni con semitono più alto (#)
# Es: Am6_120.mp3 -> A#m6_120.mp3
# Esclude file che iniziano per E o B

if [[ ! -n $1 ]];
then 
    DIR="."
else
    DIR=$1
fi


for file in "$DIR"/*.mp3; do
    [ -e "$file" ] || continue
    
    filename=$(basename "$file")
    
    # Salta i file che iniziano per E o B
    if [[ "$filename" == E* ]] || [[ "$filename" == B* ]]; then
        echo "Saltato (E o B): $filename"
        continue
    fi
    
    # Salta i file che hanno già il #
    if [[ "$filename" == *"#"* ]]; then
        echo "Saltato (già #): $filename"
        continue
    fi
    
    # Inserisci # dopo la prima lettera
    newname="${filename:0:1}#${filename:1}"
    
    # Esegui ffmpeg per alzare di un semitono
    ffmpeg -i "$file" -af "rubberband=pitch=1.059463094" -acodec libmp3lame -b:a 192k "$DIR/$newname"
    
    echo "Creato: $filename -> $newname"
done

echo "Operazione completata!"
