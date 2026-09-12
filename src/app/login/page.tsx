import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Accedi" };

export default function LoginPage() {
  return (
    <main className="flex min-h-[80vh] flex-col justify-center">
      <div className="pb-8 text-center">
        <h1 className="text-[28px] font-bold tracking-tight">Personal Trainer</h1>
        <p className="mt-1 text-[15px] text-muted">Inserisci la password per continuare</p>
      </div>
      <LoginForm />
    </main>
  );
}
