@echo off
cd /d C:\kerskol-tts
set HF_HOME=C:\Audiobooks\hf-cache
set HF_HUB_OFFLINE=1
set TRANSFORMERS_OFFLINE=1
echo %DATE% %TIME% GENERATION en cours > C:\kerskol-tts\ETAT.txt
C:\Audiobooks\venv\Scripts\python.exe -u gen_kerskol.py --out C:\kerskol-tts\sortie >> C:\kerskol-tts\run_all.log 2>&1
if errorlevel 1 (echo %DATE% %TIME% ERREUR generation >> C:\kerskol-tts\ETAT.txt & exit /b 1)
echo %DATE% %TIME% GENERATION OK, RELECTURE en cours >> C:\kerskol-tts\ETAT.txt
C:\Audiobooks\venv_asr\Scripts\python.exe -u relecture.py --out C:\kerskol-tts\sortie >> C:\kerskol-tts\run_all.log 2>&1
if errorlevel 1 (echo %DATE% %TIME% ERREUR relecture >> C:\kerskol-tts\ETAT.txt & exit /b 1)
echo %DATE% %TIME% RELECTURE OK, ALIGNEMENT en cours >> C:\kerskol-tts\ETAT.txt
C:\Audiobooks\venv\Scripts\python.exe -u alignement.py --out C:\kerskol-tts\sortie >> C:\kerskol-tts\run_all.log 2>&1
if errorlevel 1 (echo %DATE% %TIME% ERREUR alignement >> C:\kerskol-tts\ETAT.txt & exit /b 1)
echo %DATE% %TIME% TERMINE >> C:\kerskol-tts\ETAT.txt
