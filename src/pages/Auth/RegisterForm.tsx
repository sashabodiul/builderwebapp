// src/pages/Auth/RegisterForm.tsx
import {useEffect, useMemo, useState} from 'react';
import {useNavigate} from 'react-router-dom';
import {useTranslation} from 'react-i18next';
import {useDispatch} from 'react-redux';
import './RegisterForm.css';
import MapSelector from './MapSelector/MapSelector';
import LanguageSwitcher from '../../components/layout/LanguageSwitcher';
import 'leaflet/dist/leaflet.css';
import {registerWorker, getWorkerByTelegramId} from '../../requests/worker';
import {setUser} from '../../store/slice';
import {WorkerRegisterData} from '../../requests/worker/types';
import {toastError} from '../../lib/toasts';

import guidePdf from '../../assets/measure-guide.pdf';

type NullableFile = File | null;
type Step = 1 | 2 | 3 | 4;

const DRAFT_KEY = 'registerDraft_v1';

const RegisterForm = () => {
  const {t} = useTranslation();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [step, setStep] = useState<Step>(1);

  // Telegram data
  const [telegramId, setTelegramId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [languageCode, setLanguageCode] = useState('');

  // Required fields
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

  // Initialize Telegram data
  useEffect(() => {
    if (import.meta.env.VITE_DEBUG) {
      // Hardcoded values for development
      setTelegramId(1359929127);
      setUsername('tweeedlex');
      setLanguageCode('en');
    } else {
      const telegramUser = window.Telegram?.WebApp?.initDataUnsafe?.user;
      if (telegramUser) {
        setTelegramId(telegramUser.id);
        setUsername(telegramUser.username || '');
        setLanguageCode(telegramUser.language_code || '');
      }
    }
  }, []);

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
    } catch {
    }
  }, []);

  // Сохранение черновика при изменениях
  useEffect(() => {
    const draft = {
      email, password, firstName, lastName, birthDate, homeAddress,
      emergencyName, emergencyPhone, geoLat, geoLng,
      heightCm, chestCm, hipsCm, inseamCm, pantsWaistCm, topWaistCm, headCircumferenceCm
    };
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
  }, [
    email, password, firstName, lastName, birthDate, homeAddress,
    emergencyName, emergencyPhone, geoLat, geoLng, heightCm, chestCm,
    hipsCm, inseamCm, pantsWaistCm, topWaistCm, headCircumferenceCm
  ]);

  const registerRequest = async () => {
    if (!telegramId) {
      throw new Error('Telegram ID is required');
    }

    const registerData: WorkerRegisterData = {
      email,
      password,
      first_name: firstName,
      last_name: lastName,
      telegram_id: telegramId,
      username: username || undefined,
      language_code: languageCode || undefined,
      emergency_relative_phone: emergencyPhone || undefined,
      emergency_relative_name: emergencyName || undefined,
      home_address: homeAddress || undefined,
      geo_lat: geoLat ? Number(geoLat) : undefined,
      geo_lng: geoLng ? Number(geoLng) : undefined,
      birth_date: birthDate || undefined,
      height_cm: heightCm ? Number(heightCm) : undefined,
      top_waist_cm: topWaistCm ? Number(topWaistCm) : undefined,
      chest_cm: chestCm ? Number(chestCm) : undefined,
      pants_waist_cm: pantsWaistCm ? Number(pantsWaistCm) : undefined,
      hips_cm: hipsCm ? Number(hipsCm) : undefined,
      inseam_cm: inseamCm ? Number(inseamCm) : undefined,
      head_circumference_cm: headCircumferenceCm ? Number(headCircumferenceCm) : undefined,
      passport_photo: passportPhoto || undefined,
      driver_license_photo: driverLicensePhoto || undefined,
    };

    return await registerWorker(registerData);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    // Register the worker
    const registerResponse = await registerRequest();
    
    if (registerResponse?.error) {
      console.log("Registration error:", registerResponse);
      const errorData = registerResponse.data as any;
      const msg = errorData?.detail || errorData?.message || t('auth.registerError');
      toastError(`${t('auth.registerError')}: ${msg}`);
      setIsLoading(false);
      return;
    }
    
    // After successful registration, fetch the worker data and set it in store
    if (telegramId) {
      const response = await getWorkerByTelegramId(telegramId);
      if (response?.error) {
        console.error("Failed to fetch user data after registration:", response);
        toastError('Failed to fetch user data after registration');
        setIsLoading(false);
        return;
      }
      dispatch(setUser(response.data));
      sessionStorage.removeItem(DRAFT_KEY);
      navigate('/');
    }
    
    setIsLoading(false);
  };

  const canNext = useMemo(() => {
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
  }, [step, email, password, firstName, lastName, birthDate]);

  const progressPct = useMemo(() => (step / 4) * 100, [step]);

  return (
    <div className="login-container">
      <LanguageSwitcher/>
      <div className="login-card">
        <div className="login-header">
          <h2>
            {t('auth.create')} <span className={"text-3xl"}>SKYBUD</span>
          </h2>
          <p>{t('auth.registerSubtitle')}</p>
        </div>

        <div className="stepper">
          <div className="stepper-track">
            <div className="stepper-progress" style={{width: `${progressPct}%`}}/>
          </div>
          <div className="stepper-dots">
            {[1, 2, 3, 4].map((i) => (
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
            {step === 1 && t('auth.step1')}
            {step === 2 && t('auth.step2')}
            {step === 3 && t('auth.step3')}
            {step === 4 && t('auth.step4')}
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* === REGISTER WIZARD === */}
          {step === 1 && (
            <>
              <div className="input-group">
                <label>{t('auth.email')}</label>
                <input
                  type="email"
                  placeholder={t('auth.emailPlaceholder')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  autoComplete="email"
                />
                <span className="input-highlight"></span>
              </div>

              <div className="input-group">
                <label>{t('auth.password')}</label>
                <div className="password-wrap">
                  <input
                    type={showPass ? 'text' : 'password'}
                    placeholder={t('auth.passwordPlaceholderRegister')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className="pass-toggle"
                    onClick={() => setShowPass((v) => !v)}
                    aria-label={showPass ? t('auth.hidePasswordAria') : t('auth.showPasswordAria')}
                    title={showPass ? t('auth.hidePassword') : t('auth.showPassword')}
                  >
                    {showPass ? t('auth.hide') : t('auth.show')}
                  </button>
                </div>
                <div className="helper-text">{t('auth.passwordHelper')}</div>
                <span className="input-highlight"></span>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="grid-2">
                <div className="input-group">
                  <label>{t('auth.firstName')}</label>
                  <input
                    type="text"
                    placeholder={t('auth.firstName')}
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>{t('auth.lastName')}</label>
                  <input
                    type="text"
                    placeholder={t('auth.lastName')}
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>{t('auth.birthDate')}</label>
                  <input
                    type="date"
                    placeholder={t('auth.birthDatePlaceholder')}
                    value={birthDate}
                    onChange={(e) => setBirthDate(e.target.value)}
                    required
                  />
                </div>
                <div className="input-group">
                  <label>{t('auth.homeAddress')}</label>
                  <input
                    type="text"
                    placeholder={t('auth.addressPlaceholder')}
                    value={homeAddress}
                    onChange={(e) => setHomeAddress(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-2">
                <div className="input-group">
                  <label>{t('auth.emergencyContactName')}</label>
                  <input
                    type="text"
                    placeholder={t('auth.emergencyContactNamePlaceholder')}
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>{t('auth.emergencyContactPhone')}</label>
                  <input
                    type="text"
                    placeholder={t('auth.emergencyContactPhonePlaceholder')}
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
                <label>{t('auth.locationOnMap')}</label>
                <div className="map-picker-row">
                  <div className="map-picked">
                    {geoLat && geoLng ? (
                      <span>{t('auth.locationSelected', {
                        lat: Number(geoLat).toFixed(6),
                        lng: Number(geoLng).toFixed(6)
                      })}</span>
                    ) : (
                      <span className="muted">{t('auth.locationNotSelected')}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    className="btn-primary"
                    onClick={() => setMapOpen(true)}
                  >
                    {t('auth.selectOnMap')}
                  </button>
                </div>
                <div className="helper-text">
                  {t('auth.locationHelper')}
                </div>
              </div>

              <div className="divider"></div>

              <div className="grid-3">
                <div className="input-group">
                  <label>{t('auth.height')}</label>
                  <input
                    type="number"
                    placeholder={t('auth.heightPlaceholder')}
                    value={heightCm}
                    onChange={(e) => setHeightCm(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>{t('auth.chest')}</label>
                  <input
                    type="number"
                    placeholder={t('auth.chestPlaceholder')}
                    value={chestCm}
                    onChange={(e) => setChestCm(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>{t('auth.hips')}</label>
                  <input
                    type="number"
                    placeholder={t('auth.hipsPlaceholder')}
                    value={hipsCm}
                    onChange={(e) => setHipsCm(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid-3">
                <div className="input-group">
                  <label>{t('auth.inseam')}</label>
                  <input
                    type="number"
                    placeholder={t('auth.inseamPlaceholder')}
                    value={inseamCm}
                    onChange={(e) => setInseamCm(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>{t('auth.pantsWaist')}</label>
                  <input
                    type="number"
                    placeholder={t('auth.pantsWaistPlaceholder')}
                    value={pantsWaistCm}
                    onChange={(e) => setPantsWaistCm(e.target.value)}
                  />
                </div>
                <div className="input-group">
                  <label>{t('auth.topWaist')}</label>
                  <input
                    type="number"
                    placeholder={t('auth.topWaistPlaceholder')}
                    value={topWaistCm}
                    onChange={(e) => setTopWaistCm(e.target.value)}
                  />
                </div>
              </div>

              <div className="input-group">
                <label>{t('auth.headCircumference')}</label>
                <input
                  type="number"
                  placeholder={t('auth.headCircumferencePlaceholder')}
                  value={headCircumferenceCm}
                  onChange={(e) => setHeadCircumferenceCm(e.target.value)}
                />
              </div>

              <div className="helper-text">
                {t('auth.measurementHelper')}{' '}
                <button
                  type="button"
                  className="linklike"
                  onClick={() => setPdfOpen(true)}
                >
                  {t('auth.measurementGuideLink')}
                </button>
              </div>
            </>
          )}

          {step === 4 && (
            <>
              <div className="grid-2">
                <div className="input-group">
                  <label className="file-label">
                    {t('auth.passportFile')}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setPassportPhoto(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {passportPhoto && (
                    <div className="helper-text">{t('auth.fileSelectedText', {filename: passportPhoto.name})}</div>
                  )}
                </div>
                <div className="input-group">
                  <label className="file-label">
                    {t('auth.driverLicenseFile')}
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => setDriverLicensePhoto(e.target.files?.[0] ?? null)}
                    />
                  </label>
                  {driverLicensePhoto && (
                    <div className="helper-text">{t('auth.fileSelectedText', {filename: driverLicensePhoto.name})}</div>
                  )}
                </div>
              </div>

              <div className="success-message" role="status">
                {t('auth.almostDone')}
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
                {t('auth.back')}
              </button>
            )}
            {step < 4 && (
              <button
                type="button"
                className="btn-primary"
                onClick={() => canNext && setStep(((step + 1) as Step))}
                disabled={!canNext}
              >
                {t('auth.next')}
              </button>
            )}
          </div>


          {
            step === 4 &&
            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading
                ? <div className="spinner"></div>
                : t('auth.completeRegistration')}
            </button>
          }
        </form>

        {/*<div className="login-footer">*/}
        {/*  <p>{t('auth.registerHelpText')}</p>*/}
        {/*</div>*/}

        <div className="login-decoration">
          <div className="decoration-orb orange"></div>
          <div className="decoration-orb gray"></div>
        </div>
      </div>

      {pdfOpen && (
        <div className="modal-backdrop" onClick={() => setPdfOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{t('auth.measurementGuideTitle')}</h3>
              <button className="modal-close" onClick={() => setPdfOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <iframe
                title={t('auth.measurementGuide')}
                src={guidePdf}
                className="pdf-frame"
              />
            </div>
            <div className="modal-foot">
              <a href={guidePdf} target="_blank" rel="noopener noreferrer"
                 className="btn-primary">{t('auth.openPdf')}</a>
              <a href={guidePdf} download className="btn-secondary">{t('auth.downloadPdf')}</a>
              <button className="btn-secondary" onClick={() => setPdfOpen(false)}>{t('auth.close')}</button>
            </div>
          </div>
        </div>
      )}

      {mapOpen && (
        <div className="modal-backdrop" onClick={() => setMapOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-head">
              <h3>{t('auth.locationSelection')}</h3>
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
              <button className="btn-secondary" onClick={() => setMapOpen(false)}>{t('auth.close')}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterForm;
