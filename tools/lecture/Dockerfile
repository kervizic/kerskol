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

# aeneas (2017) compile des extensions C via numpy.distutils : incompatible avec
# setuptools>=60 et numpy>=1.22. On FIGE des versions compatibles et on force
# setuptools a utiliser le distutils de la stdlib (Python 3.9). numpy doit etre
# present AVANT aeneas (ses extensions en dependent) -> --no-build-isolation.
ENV SETUPTOOLS_USE_DISTUTILS=stdlib
RUN pip install --no-cache-dir "setuptools==59.8.0" "wheel==0.38.4" \
 && pip install --no-cache-dir "numpy==1.21.6" "lxml>=4.9,<5" "beautifulsoup4>=4.9"
RUN pip install --no-cache-dir --no-build-isolation "aeneas==1.7.3.0"

WORKDIR /work
CMD ["python3", "tools/lecture/aligner.py", "--all"]
