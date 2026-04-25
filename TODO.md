# TODO - Remove InfluxDB + Integrate ThingsBoard iframe

## Backend
- [x] Remove `influxdb-client` from `requirements.txt`
- [x] Remove InfluxDB config from `config.py`
- [x] Remove InfluxDB code from `db.py`
- [x] Remove InfluxDB init from `app.py`
- [x] Remove InfluxDB query from `routes_sensors.py`

## Frontend
- [x] Add ThingsBoard iframe to `Dashboard.jsx` (replace sensor cards + chart)
- [x] Add iframe styles to `Dashboard.css`

## Follow-up
- [x] Code changes completed ✅
- [ ] Run `pip install -r backend/requirements.txt` to clean InfluxDB dependency
- [ ] Restart Flask backend
- [ ] Run `npm run dev` in `app-react/` and verify the ThingsBoard iframe loads

