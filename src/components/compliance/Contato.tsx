import React, { useState } from 'react';
import { Navbar } from '../../../Navbar';
import { Footer } from '../../../Footer';

export const Contato: React.FC = () => {
  const [formData, setFormData] = useState({
    nome: '',
    email: '',
    telefone: '',
    placa: '',
    mensagem: '',
  });
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => {
      setSubmitted(false);
      setFormData({ nome: '', email: '', telefone: '', placa: '', mensagem: '' });
    }, 4000);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      <Navbar isScrolled={true} />

      <main className="flex-grow pt-32 pb-20 px-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="border-b border-slate-800 pb-8 mb-12 text-center md:text-left">
            <span className="text-primary font-bold text-xs uppercase tracking-widest block mb-2">Fale Conosco</span>
            <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight">Atendimento & Suporte</h1>
            <p className="text-slate-400 mt-3 text-base">Estamos disponíveis 24 horas por dia para garantir a sua tranquilidade.</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-start">
            {/* Info Column (5 Cols) */}
            <div className="lg:col-span-5 space-y-8">
              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                  <span className="material-icons-round text-primary text-xl">support_agent</span>
                  Canais de Atendimento
                </h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Telefone e WhatsApp</span>
                    <a
                      href="https://wa.me/5581985938044"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-white hover:text-primary transition-colors text-xl font-black block mt-1"
                    >
                      (81) 98593-8044
                    </a>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">E-mail Comercial</span>
                    <a href="mailto:contato@3arastrear.com.br" className="text-slate-300 hover:text-primary transition-colors text-sm font-bold block mt-1">
                      contato@3arastrear.com.br
                    </a>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Horário de Funcionamento</span>
                    <p className="text-slate-300 text-sm font-medium mt-1">
                      Comercial: Seg. a Sex. das 08h às 18h.<br />
                      Emergências e Rastreamento: <strong>24 horas por dia</strong>.
                    </p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                  <span className="material-icons-round text-primary text-xl">gavel</span>
                  Privacidade de Dados
                </h3>
                <p className="text-sm text-slate-400 font-medium leading-relaxed mb-4">
                  Deseja consultar seus dados armazenados, solicitar alterações ou tirar dúvidas sobre o tratamento de informações? Entre em contato pelo canal de atendimento oficial.
                </p>
                <div className="bg-slate-950/60 border border-slate-800/80 p-4 rounded-xl">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Canal de Privacidade</span>
                  <a href="mailto:contato@3arastrear.com.br" className="text-primary hover:underline text-sm font-bold block mt-1">
                    contato@3arastrear.com.br
                  </a>
                </div>
              </div>

              <div className="bg-slate-900/60 border border-slate-800 p-6 rounded-2xl">
                <h3 className="text-white font-bold text-lg mb-4 flex items-center gap-2">
                  <span className="material-icons-round text-primary text-xl">map</span>
                  Nacional
                </h3>
                <p className="text-sm text-slate-400 font-medium leading-relaxed">
                  Oferecemos cobertura e monitoramento inteligente em 100% do território nacional. Onde houver sinal, seu patrimônio estará seguro.
                </p>
              </div>
            </div>

            {/* Form Column (7 Cols) */}
            <div className="lg:col-span-7 bg-slate-900/60 border border-slate-800 p-8 rounded-3xl relative">
              <h3 className="text-white font-black text-xl mb-6">Envie uma Mensagem</h3>

              {submitted ? (
                <div className="bg-primary/10 border border-primary/30 p-6 rounded-2xl flex flex-col items-center justify-center text-center animate-fade-in-up py-16">
                  <span className="material-icons-round text-primary text-5xl mb-4 animate-bounce">check_circle</span>
                  <h4 className="text-white font-black text-lg mb-2">Mensagem Enviada!</h4>
                  <p className="text-sm text-slate-300 max-w-sm">
                    Agradecemos seu contato. Nossa equipe retornará seu chamado o mais breve possível.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="nome" className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Nome Completo</label>
                      <input
                        type="text"
                        id="nome"
                        name="nome"
                        required
                        value={formData.nome}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary transition-colors font-medium"
                        placeholder="Ex: Carlos Silva"
                      />
                    </div>
                    <div>
                      <label htmlFor="email" className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">E-mail</label>
                      <input
                        type="email"
                        id="email"
                        name="email"
                        required
                        value={formData.email}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary transition-colors font-medium"
                        placeholder="nome@email.com"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label htmlFor="telefone" className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">WhatsApp / Telefone</label>
                      <input
                        type="tel"
                        id="telefone"
                        name="telefone"
                        required
                        value={formData.telefone}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary transition-colors font-medium"
                        placeholder="(81) 99999-9999"
                      />
                    </div>
                    <div>
                      <label htmlFor="placa" className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Placa do Veículo (Opcional)</label>
                      <input
                        type="text"
                        id="placa"
                        name="placa"
                        value={formData.placa}
                        onChange={handleChange}
                        className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary transition-colors font-medium"
                        placeholder="ABC-1234"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="mensagem" className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">Mensagem</label>
                    <textarea
                      id="mensagem"
                      name="mensagem"
                      required
                      rows={5}
                      value={formData.mensagem}
                      onChange={handleChange}
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:border-primary transition-colors font-medium resize-none"
                      placeholder="Como podemos te ajudar?"
                    ></textarea>
                  </div>

                  <div className="flex items-start gap-3 bg-slate-950/40 p-4 rounded-xl border border-slate-800/80">
                    <input
                      type="checkbox"
                      id="privacy_accept"
                      required
                      className="mt-1 accent-primary focus:ring-primary rounded"
                    />
                    <label htmlFor="privacy_accept" className="text-xs text-slate-400 font-medium leading-relaxed cursor-pointer">
                      Declaro que li e concordo com os termos da <a href="/politica-privacidade" className="text-primary hover:underline font-bold">Política de Privacidade</a> da 3A RASTREAR para o tratamento dos meus dados.
                    </label>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500 font-medium pl-1">
                    <span className="material-icons-round text-accent text-sm">lock</span>
                    Seus dados estão protegidos sob nossa Política de Privacidade.
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-primary hover:bg-yellow-500 text-secondary font-black py-4 rounded-xl shadow-lg hover:scale-[1.01] active:scale-95 transition-all text-sm uppercase tracking-wider"
                  >
                    ENVIAR MENSAGEM
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};
