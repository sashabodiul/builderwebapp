// src/components/Auth/LoginForm.tsx
import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import './LoginForm.css';
import MapSelector from './MapSelector/MapSelector';
import 'leaflet/dist/leaflet.css';

import guidePdf from '../../assets/measure-guide.pdf';

const API_BASE = import.meta.env.VITE_API_BASE ?? 'https://api-crm.skybud.de/api/v1';
// const API_BASE = 'http://localhost:89/api/v1';

type NullableFile = File | null;
type Mode = 'login' | 'register';
type Step = 1 | 2 | 3 | 4;

const DRAFT_KEY = 'registerDraft_v1';

const LoginForm = () => {
  const [mode, setMode] = useState<Mode>('login');

  const [step, setStep] = useState<Step>(1);

  // Общие поля
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Регистрационные поля
  const [firstName, setFirstName] = useState('');      // first_name
  const [lastName, setLastName] = useState('');        // last_name
  const [birthDate, setBirthDate] = useState('');      // YYYY-MM-DD
  const [homeAddress, setHomeAddress] = useState('');  // home_address
  const [emergencyName, setEmergencyName] = useState('');   // emergency_relative_name
  const [emergencyPhone, setEmergencyPhone] = useState(''); // emergency_relative_phone

  // Координаты выбираются на карте
  const [geoLat, setGeoLat] = useState<string>('');    // -90..90
  const [geoLng, setGeoLng] = useState<string>('');    // -180..180

  // Измерения
  const [heightCm, setHeightCm] = useState<string>(''); // height_cm
  const [chestCm, setChestCm] = useState<string>('');   // chest_cm
  const [hipsCm, setHipsCm] = useState<string>('');     // hips_cm
  const [inseamCm, setInseamCm] = useState<string>(''); // inseam_cm
  const [pantsWaistCm, setPantsWaistCm] = useState<string>(''); // pants_waist_cm
  const [topWaistCm, setTopWaistCm] = useState<string>('');     // top_waist_cm
  const [headCircumferenceCm, setHeadCircumferenceCm] = useState<string>(''); // head_circumference_cm

  // Файлы
  const [passportPhoto, setPassportPhoto] = useState<NullableFile>(null);
  const [driverLicensePhoto, setDriverLicensePhoto] = useState<NullableFile>(null);

  // Модалки
  const [pdfOpen, setPdfOpen] = useState(false);
  const [mapOpen, setMapOpen] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Восстановление черновика регистрации
  useEffect(() => {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return;
    try {
      const d = JSON.parse(raw);
      if (d.email) setEmail(d.email);
      if (d.password) setPassword(d.password);
      if (d.firstName) setFirstName(d.firstName);
      if (d.lastName) setLastName(d.lastName);
      if (d.birthDate) setBirthDate(d.birthDate);
      if (d.homeAddress) setHomeAddress(d.homeAddress);
      if (d.emergencyName) setEmergencyName(d.emergencyName);
      if (d.emergencyPhone) setEmergencyPhone(d.emergencyPhone);
      if (d.geoLat) setGeoLat(String(d.geoLat));
      if (d.geoLng) setGeoLng(String(d.geoLng));
      if (d.heightCm) setHeightCm(String(d.heightCm));
      if (d.chestCm) setChestCm(String(d.chestCm));
      if (d.hipsCm) setHipsCm(String(d.hipsCm));
      if (d.inseamCm) setInseamCm(String(d.inseamCm));
      if (d.pantsWaistCm) setPantsWaistCm(String(d.pantsWaistCm));
      if (d.topWaistCm) setTopWaistCm(String(d.topWaistCm));
      if (d.headCircumferenceCm) setHeadCircumferenceCm(String(d.headCircumferenceCm));
    } catch {}
  }, []);

  // Сохранение черновика при изменениях (только в режиме регистрации)
  useEffect(() => {
    if (mode !== 'register') return;
    const draft = {
      email, password, firstName, lastName, birthDate, homeAddress,
      emergencyName, emergencyPhone, geoLat, geoLng,
      heightCm, chestCm, hipsCm, inseamCm, pantsWaistCm, topWaistCm, headCircumferenceCm
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [
    mode, email, password, firstName, lastName, birthDate, homeAddress,
    emergencyName, emergencyPhone, geoLat, geoLng, heightCm, chestCm,
    hipsCm, inseamCm, pantsWaistCm, topWaistCm, headCircumferenceCm
  ]);

  const saveToken = (token?: string) => {
    if (!token) return;
    localStorage.setItem('authToken', token);
    localStorage.setItem('username', email);
  };

  const extractToken = (data: any): string | undefined =>
    data?.access_token || data?.token || data?.jwt || data?.data?.token;

  const loginRequest = async (mail: string, pass: string) => {
    const body = new URLSearchParams();
    body.set('grant_type', 'password');
    body.set('username', mail);
    body.set('password', pass);
    body.set('scope', '');
    body.set('client_id', 'string');
    body.set('client_secret', 'string');

    const resp = await axios.post(`${API_BASE}/auth/token`, body.toString(), {
      headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'Accept': 'application/json' },
    });
    const tok = extractToken(resp.data);
    saveToken(tok);
    return tok;
  };

  const registerRequest = async () => {
    const fd = new FormData();
    if (heightCm) fd.append('height_cm', heightCm);
    if (hipsCm) fd.append('hips_cm', hipsCm);
    if (inseamCm) fd.append('inseam_cm', inseamCm);
    if (chestCm) fd.append('chest_cm', chestCm);
    if (pantsWaistCm) fd.append('pants_waist_cm', pantsWaistCm);
    if (topWaistCm) fd.append('top_waist_cm', topWaistCm);
    if (headCircumferenceCm) fd.append('head_circumference_cm', headCircumferenceCm);

    if (birthDate) fd.append('birth_date', birthDate);
    if (emergencyName) fd.append('emergency_relative_name', emergencyName);
    if (emergencyPhone) fd.append('emergency_relative_phone', emergencyPhone);

    if (homeAddress) fd.append('home_address', homeAddress);
    if (firstName) fd.append('first_name', firstName);
    if (lastName) fd.append('last_name', lastName);

    if (geoLat) fd.append('geo_lat', geoLat);
    if (geoLng) fd.append('geo_lng', geoLng);

    fd.append('email', email);
    fd.append('password', password);

    if (passportPhoto) fd.append('passport_photo', passportPhoto, passportPhoto.name);
    if (driverLicensePhoto) fd.append('driver_license_photo', driverLicensePhoto, driverLicensePhoto.name);

    const resp = await axios.post(`${API_BASE}/registration/register`, fd, {
      headers: { Accept: 'application/json' },
    });
    return resp.data;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      if (mode === 'login') {
        await loginRequest(email, password);
        navigate('/dashboard');
      } else {
        await registerRequest();
        await loginRequest(email, password);
        sessionStorage.removeItem(DRAFT_KEY);
        navigate('/dashboard');
      }
    } catch (err: any) {
      console.error(err);
      const msg = err?.response?.data?.detail || err?.response?.data?.message || err?.message || 'Ошибка';
      setError(mode === 'login' ? `Ошибка входа: ${msg}` : `Ошибка регистрации: ${msg}`);
    } finally {
      setIsLoading(false);
    }
  };

  const switchMode = () => {
    setMode((m) => (m === 'login' ? 'register' : 'login'));
    setError('');
    setStep(1);
  };

  const canNext = useMemo(() => {
    if (mode !== 'register') return false;
    if (step === 1) {
      return Boolean(email && password);
    }
    if (step === 2) {
      return Boolean(firstName && lastName && birthDate);
    }
    if (step === 3) {
      // Выбор точки на карте не делаем обязательным, чтобы не блокировать
      return true;
    }
    return false;
  }, [mode, step, email, password, firstName, lastName, birthDate]);

  const progressPct = useMemo(() => (step / 4) * 100, [step]);

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="mode-tabs" role="tablist">
          <button
            role="tab"
            aria-selected={mode === 'login'}
            className="mode-tab"
            onClick={() => mode !== 'login' && switchMode()}
          >
            Вход
          </button>
          <button
            role="tab"
            aria-selected={mode === 'register'}
            className="mode-tab"
            onClick={() => mode !== 'register' && switchMode()}
          >
            Создать профиль
          </button>
        </div>

        <div className="login-header">
          <h2>
            {mode === 'login' ? 'Добро пожаловать в ' : 'Создать '}
            <span>SKYBUD</span>
          </h2>
          <p>{mode === 'login' ? 'Войдите в свой аккаунт' : 'Заполните форму регистрации'}</p>
        </div>

        {mode === 'register' && (
          <>
            <div className="stepper">
              <div className="stepper-track">
                <div className="stepper-progress" style={{ width: `${progressPct}%` }} />
              </div>
              <div className="stepper-dots">
                {[1,2,3,4].map((i) => (
                  <button
                    key={i}
                    className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`}
                    onClick={() => setStep(i as Step)}
                    aria-label={`Перейти к шагу ${i}`}
                    type="button"
                  >
                    {i}
                  </button>
                ))}
              </div>
              <div className="stepper-label">
                {step === 1 && 'Основные данные'}
                {step === 2 && 'Личная информация'}
                {step === 3 && 'Местоположение и замеры'}
                {step === 4 && 'Документы'}
              </div>
            </div>
          </>
        )}

        <form onSubmit={handleSubmit}>
          {/* === LOGIN === */}
          {mode === 'login' && (
            <>
              <div className="input-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Введите ваш email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <span className="input-highlight"></span>
              </div>

              <div className="input-group">
                <label>Пароль</label>
                <div className="password-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder="Введите пароль"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    className="pass-toggle"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? 'Скрыть пароль' : 'Показать пароль'}
                    title={showPass ? 'Скрыть пароль' : 'Показать пароль'}
                  >
                    {showPass ? 'Скрыть' : 'Показать'}
                  </button>
                </div>
                <span className="input-highlight"></span>
              </div>
            </>
          )}

          {/* === REGISTER WIZARD === */}
          {mode === 'register' && (
            <>
              {step === 1 && (
                <>
                  <div className="input-group">
                    <label>Email</label>
                    <input
                      type="email"
                      placeholder="Введите ваш email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      autoComplete="email"
                    />
                    <span className="input-highlight"></span>
                  </div>

                  <div className="input-group">
                    <label>Пароль</label>
                    <div className="password-wrap">
                      <input
                        type={showPass ? 'text' : 'password'}
                        placeholder="Придумайте надежный пароль"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="new-password"
                      />
                      <button
                        type="button"
                        className="pass-toggle"
                        onClick={() => setShowPass((v) => !v)}
                        aria-label={showPass ? 'Скрыть пароль' : 'Показать пароль'}
                        title={showPass ? 'Скрыть пароль' : 'Показать пароль'}
                      >
                        {showPass ? 'Скрыть' : 'Показать'}
                      </button>
                    </div>
                    <div className="helper-text">Минимум 8 символов, включая цифры и буквы</div>
                    <span className="input-highlight"></span>
                  </div>
                </>
              )}

              {step === 2 && (
                <>
                  <div className="grid-2">
                    <div className="input-group">
                      <label>Имя</label>
                      <input
                        type="text"
                        placeholder="Имя"
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label>Фамилия</label>
                      <input
                        type="text"
                        placeholder="Фамилия"
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        required
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="input-group">
                      <label>Дата рождения</label>
                      <input
                        type="date"
                        placeholder="ДД.ММ.ГГГГ"
                        value={birthDate}
                        onChange={(e) => setBirthDate(e.target.value)}
                        required
                      />
                    </div>
                    <div className="input-group">
                      <label>Домашний адрес</label>
                      <input
                        type="text"
                        placeholder="Введите ваш адрес"
                        value={homeAddress}
                        onChange={(e) => setHomeAddress(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid-2">
                    <div className="input-group">
                      <label>Контакт для экстренных случаев</label>
                      <input
                        type="text"
                        placeholder="Имя контактного лица"
                        value={emergencyName}
                        onChange={(e) => setEmergencyName(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label>Телефон экстренного контакта</label>
                      <input
                        type="text"
                        placeholder="+7 (999) 123-45-67"
                        value={emergencyPhone}
                        onChange={(e) => setEmergencyPhone(e.target.value)}
                      />
                    </div>
                  </div>
                </>
              )}

              {step === 3 && (
                <>
                  <div className="input-group">
                    <label>Местоположение на карте</label>
                    <div className="map-picker-row">
                      <div className="map-picked">
                        {geoLat && geoLng ? (
                          <span>Выбрано: {Number(geoLat).toFixed(6)}, {Number(geoLng).toFixed(6)}</span>
                        ) : (
                          <span className="muted">Местоположение не выбрано</span>
                        )}
                      </div>
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={() => setMapOpen(true)}
                      >
                        Выбрать на карте
                      </button>
                    </div>
                    <div className="helper-text">
                      Выберите ваше местоположение для точной доставки
                    </div>
                  </div>

                  <div className="divider"></div>

                  <div className="grid-3">
                    <div className="input-group">
                      <label>Рост (см)</label>
                      <input
                        type="number"
                        placeholder="170"
                        value={heightCm}
                        onChange={(e) => setHeightCm(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label>Обхват груди (см)</label>
                      <input
                        type="number"
                        placeholder="90"
                        value={chestCm}
                        onChange={(e) => setChestCm(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label>Обхват бедер (см)</label>
                      <input
                        type="number"
                        placeholder="95"
                        value={hipsCm}
                        onChange={(e) => setHipsCm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid-3">
                    <div className="input-group">
                      <label>Длина по внутреннему шву (см)</label>
                      <input
                        type="number"
                        placeholder="75"
                        value={inseamCm}
                        onChange={(e) => setInseamCm(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label>Обхват талии для брюк (см)</label>
                      <input
                        type="number"
                        placeholder="80"
                        value={pantsWaistCm}
                        onChange={(e) => setPantsWaistCm(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <label>Обхват талии для верха (см)</label>
                      <input
                        type="number"
                        placeholder="85"
                        value={topWaistCm}
                        onChange={(e) => setTopWaistCm(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Обхват головы (см)</label>
                    <input
                      type="number"
                      placeholder="58"
                      value={headCircumferenceCm}
                      onChange={(e) => setHeadCircumferenceCm(e.target.value)}
                    />
                  </div>

                  <div className="helper-text">
                    Для точных замеров используйте{' '}
                    <button
                      type="button"
                      className="linklike"
                      onClick={() => setPdfOpen(true)}
                    >
                      инструкцию по замерам
                    </button>
                  </div>
                </>
              )}

              {step === 4 && (
                <>
                  <div className="grid-2">
                    <div className="input-group">
                      <label className="file-label">
                        Фото паспорта
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setPassportPhoto(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      {passportPhoto && (
                        <div className="helper-text">Выбран файл: {passportPhoto.name}</div>
                      )}
                    </div>
                    <div className="input-group">
                      <label className="file-label">
                        Фото водительских прав
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => setDriverLicensePhoto(e.target.files?.[0] ?? null)}
                        />
                      </label>
                      {driverLicensePhoto && (
                        <div className="helper-text">Выбран файл: {driverLicensePhoto.name}</div>
                      )}
                    </div>
                  </div>

                  <div className="success-message" role="status">
                    Почти готово! Осталось только подтвердить регистрацию
                  </div>
                </>
              )}

              {/* Навигация по шагам */}
              <div className="wizard-nav">
                {step > 1 && (
                  <button
                    type="button"
                    className="btn-secondary"
                    onClick={() => setStep(((step - 1) as Step))}
                  >
                    Назад
                  </button>
                )}
                {step < 4 && (
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => canNext && setStep(((step + 1) as Step))}
                    disabled={!canNext}
                  >
                    Далее
                  </button>
                )}
              </div>
            </>
          )}

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="login-button" disabled={isLoading}>
            {isLoading
              ? <div className="spinner"></div>
              : (mode === 'login'
                  ? 'Войти'
                  : (step === 4 ? 'Завершить регистрацию' : 'Сохранить и продолжить'))}
          </button>
        </form>

        <div className="login-footer">
          {mode === 'login' ? (
            <p>
              Нет аккаунта?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); switchMode(); }}>
                Зарегистрироваться
              </a>
            </p>
          ) : (
            <p>
              Уже есть аккаунт?{' '}
              <a href="#" onClick={(e) => { e.preventDefault(); switchMode(); }}>
                Войти
              </a>
            </p>
          )}
          <a href="#" className="forgot-password">Забыли пароль?</a>
        </div>

        {/* Декор */}
        <div className="login-decoration">
          <div className="decoration-orb orange"></div>
          <div className="decoration-orb gray"></div>
        </div>
      </div>

      {/* Модалка PDF */}
      {pdfOpen && (
        <div className="modal-backdrop" onClick={() => setPdfOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Памятка по снятию мерок</h3>
              <button className="modal-close" onClick={() => setPdfOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <iframe
                title="Памятка по замерам"
                src={guidePdf}
                className="pdf-frame"
              />
            </div>
            <div className="modal-foot">
              <a href={guidePdf} target="_blank" rel="noopener noreferrer" className="btn-primary">Открыть PDF</a>
              <a href={guidePdf} download className="btn-secondary">Скачать PDF</a>
              <button className="btn-secondary" onClick={() => setPdfOpen(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}

      {/* Модалка выбора локации на карте */}
      {mapOpen && (
        <div className="modal-backdrop" onClick={() => setMapOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>Выбор местоположения</h3>
              <button className="modal-close" onClick={() => setMapOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <MapSelector
                latitude={geoLat ? Number(geoLat) : 50.4501}
                longitude={geoLng ? Number(geoLng) : 30.5234}
                onLocationSelect={(lat, lng) => {
                  setGeoLat(String(lat));
                  setGeoLng(String(lng));
                }}
                onClose={() => setMapOpen(false)}
              />
            </div>
            <div className="modal-foot">
              <button className="btn-secondary" onClick={() => setMapOpen(false)}>Закрыть</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginForm;
