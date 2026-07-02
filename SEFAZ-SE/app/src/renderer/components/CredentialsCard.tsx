import { Eye, EyeOff, KeyRound } from "lucide-react";
import { useEffect, useState } from "react";

type StoreKey = "sefaz" | "agil";

type Props = {
  storeKey: StoreKey;
  user: string;
  password: string;
  onUserChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  disabled?: boolean;
};

export default function CredentialsCard({
  storeKey,
  user,
  password,
  onUserChange,
  onPasswordChange,
  disabled,
}: Props) {
  const [showPassword, setShowPassword] = useState(false);
  const [remembered, setRemembered] = useState(false);

  useEffect(() => {
    const load = storeKey === "agil" ? window.api?.loadAgilCredentials : window.api?.loadSefazCredentials;
    load?.()
      .then((creds) => {
        if (creds) {
          onUserChange(creds.user);
          onPasswordChange(creds.password);
          setRemembered(true);
        }
      })
      .catch(() => undefined);
  }, [storeKey]);

  function handleRememberChange(checked: boolean) {
    setRemembered(checked);
    if (checked) {
      const save = storeKey === "agil" ? window.api?.saveAgilCredentials : window.api?.saveSefazCredentials;
      save?.({ user, password }).catch(() => undefined);
    } else {
      const clear = storeKey === "agil" ? window.api?.clearAgilCredentials : window.api?.clearSefazCredentials;
      clear?.().catch(() => undefined);
    }
  }

  function handleUserBlur() {
    if (remembered && user && password) {
      const save = storeKey === "agil" ? window.api?.saveAgilCredentials : window.api?.saveSefazCredentials;
      save?.({ user, password }).catch(() => undefined);
    }
  }

  function handlePasswordBlur() {
    if (remembered && user && password) {
      const save = storeKey === "agil" ? window.api?.saveAgilCredentials : window.api?.saveSefazCredentials;
      save?.({ user, password }).catch(() => undefined);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400">
        <KeyRound size={13} />
        Acesso
      </div>

      <div className="space-y-2">
        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">Login</span>
          <input
            type="text"
            autoComplete="username"
            value={user}
            onChange={(e) => onUserChange(e.target.value)}
            onBlur={handleUserBlur}
            disabled={disabled}
            placeholder="usuário"
            className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
          />
        </label>

        <label className="block">
          <span className="mb-1 block text-xs text-slate-400">Senha</span>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              value={password}
              onChange={(e) => onPasswordChange(e.target.value)}
              onBlur={handlePasswordBlur}
              disabled={disabled}
              placeholder="••••••••"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 pr-10 text-sm text-slate-100 placeholder-slate-500 outline-none transition focus:border-blue-500 focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200"
            >
              {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </label>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300">
          <input
            type="checkbox"
            checked={remembered}
            onChange={(e) => handleRememberChange(e.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-slate-600 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900"
          />
          Lembrar credenciais
        </label>
      </div>
    </div>
  );
}
