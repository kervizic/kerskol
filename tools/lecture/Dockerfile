# Conteneur d'ALIGNEMENT « lecture rythmee » (CPU, outils libres).
# aeneas = forced alignment (GNU AGPL/LGPL), synthese espeak + DTW, aucun modele
# a telecharger. ffmpeg (LGPL/GPL) = decodage/encodage. Tout tourne sur CPU.
#
# Build (sur le VPS, en Docker) :
#   docker build -t kerskol-aligner tools/lecture
# Run :
#   docker run --rm -v "$PWD":/work -w /work/tools/lecture \
#     kerskol-aligner python3 aligner.py --all
FROM python:3.9-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
      ffmpeg \
      espeak espeak-data libespeak-dev \
      gcc build-essential \
      wget ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# numpy epingle (compat aeneas 1.7.3) + lxml (dep aeneas) + aeneas.
RUN pip install --no-cache-dir "numpy==1.26.4" "lxml>=4.9" "aeneas==1.7.3.0"

WORKDIR /work
CMD ["python3", "tools/lecture/aligner.py", "--all"]
