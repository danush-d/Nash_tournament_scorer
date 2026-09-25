# Tournament Scorer (Cricket + Volleyball)

## Logins
- **Scorer login**: enters scores, manages teams and creates accounts (Accounts tab).
- **Viewer login**: read-only, live-updating every 4 seconds. Create as many as you like.
- The first scorer comes from env vars `SCORER_USER` (default `scorer`) and `SCORER_PASS`.
  If `SCORER_PASS` is not set, a random password is printed in the server log on first start.
  Setting `SCORER_PASS` again later resets that scorer's password.

## Local test
    pip install -r requirements.txt
    SCORER_PASS=MyPass123 python app.py        # http://localhost:5000

## Public link - PythonAnywhere (free, keeps data permanently)
1. Sign up at pythonanywhere.com, then **Files -> Upload** this zip and, in a **Bash console**: `unzip tournament-scorer-flask.zip`
2. In the console: `pip install --user openpyxl reportlab flask`
3. **Web -> Add a new web app -> Manual configuration** (pick Python 3.10+).
4. Set *Source code* to `/home/YOURNAME/cricket-flask`, then open the *WSGI configuration file* and replace its contents with:

       import sys, os
       sys.path.insert(0, '/home/YOURNAME/cricket-flask')
       os.environ['SCORER_USER'] = 'admin'
       os.environ['SCORER_PASS'] = 'choose-a-strong-password'
       from app import app as application

5. Click **Reload**. Your public link is `https://YOURNAME.pythonanywhere.com`.

## Public link - Render (paid disk keeps data)
Push this folder to GitHub, then Render -> New -> Blueprint (uses `render.yaml`). Set `SCORER_PASS` in the dashboard.
On a free plan without a disk, data is lost whenever the server restarts.

Env: PORT, DB_PATH, SCORER_USER, SCORER_PASS, COOKIE_SECURE=1 (HTTPS only cookies).
