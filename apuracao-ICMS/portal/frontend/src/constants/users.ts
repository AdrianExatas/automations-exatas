export interface DemoUser {
  usuario: string
  nome: string
  senha: string
  cargo: string
}

/** Lista fixa de colaboradores do setor fiscal (auth v1 sem SSO). */
export const DEMO_USERS: DemoUser[] = [
  {
    usuario: 'ana.fiscal',
    nome: 'Ana Fiscal',
    senha: 'fiscal123',
    cargo: 'Analista fiscal',
  },
  {
    usuario: 'bruno.revisor',
    nome: 'Bruno Revisor',
    senha: 'fiscal123',
    cargo: 'Revisor fiscal',
  },
  {
    usuario: 'carla.coord',
    nome: 'Carla Coordenadora',
    senha: 'fiscal123',
    cargo: 'Coordenadora fiscal',
  },
]

export interface AuthUser {
  usuario: string
  nome: string
  cargo: string
}

export const AUTH_STORAGE_KEY = 'portal-fiscal-user'
