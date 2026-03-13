import { SiegDataProvider } from './context/SiegDataContext';
import { AutomacaoFormsProvider } from './context/AutomacaoFormsContext';
import Layout from './components/Layout';

function App() {
  return (
    <SiegDataProvider>
      <AutomacaoFormsProvider>
        <Layout />
      </AutomacaoFormsProvider>
    </SiegDataProvider>
  );
}

export default App;
