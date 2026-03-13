interface ResultMessageProps {
  visible: boolean;
  success: boolean;
  message: string;
}

export default function ResultMessage({ visible, success, message }: ResultMessageProps) {
  if (!visible) return null;
  const title = success ? 'Sucesso' : 'Erro';
  return (
    <div
      className={`resultado-msg ${success ? 'success' : 'error'}`}
      role="alert"
      hidden={!visible}
    >
      <span className="titulo">{title}</span>
      <p className="mensagem">{message}</p>
    </div>
  );
}
