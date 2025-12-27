#!/bin/bash

# Script per rinominare file dal formato:
# "lapompe - 1 - Audio - C.mp3" -> "C.mp3"

if [[ ! -n $1 ]];
then 
    DIR="."
else
    DIR=$1
fi



for file in "$DIR"/*.mp3; do
    [ -e "$file" ] || continue
    
    filename=$(basename "$file")
    
    # Estrai l'ultima parte (es: "C.mp3")
    newname=$(echo "$filename" | rev | cut -d'-' -f1 | rev | xargs)
    
    if [ "$filename" != "$newname" ]; then
        mv "$file" "$DIR/$newname"
        echo "Rinominato: $filename -> $newname"
    fi
done

echo "Operazione completata!"
