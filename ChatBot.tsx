
import React, { useState, useRef, useEffect } from 'react';
import { GoogleGenAI } from "@google/genai";

export const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<{ role: 'user' | 'bot', text: string }[]>([
    { role: 'bot', text: 'Olá! Sou o assistente inteligente da 3A RASTREAR. Como posso ajudar você a proteger seu veículo hoje?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatRef = useRef<HTMLDivElement>(null);
  const logoUrl = "https://lh3.googleusercontent.com/aida-public/AB6AXuB3c9XLkXIrg4LNCSrHr00bitaHtGJaM40fH0iKNEQaSFg1qHxyPe6mgIqPpcuaD67syJe0QP0aGuGcj07u7WUnp301nbb8lMfcVMM9mfpVWmrWOgcGD7oErH3Vz8bLZFsCenGGG-5kszQqwXfV-2G8REVQz-zrW5Jcv9Ki2Sm11nkaPQR9gIr0W6DZB9nSIp8eZ-LhSyrP021cR8FsEgf-ZtJE2Kl68nyJeN-fOTVUsLaP_Tm2XbEpjetGwWhbljHZbVMlCpduvKp3";

  useEffect(() => {
    if (chatRef.current) {
      chatRef.current.scrollTop = chatRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg = input;
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setIsLoading(true);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: userMsg,
        config: {
          systemInstruction: `
            Você é o assistente virtual da 3A RASTREAR, uma empresa de rastreamento veicular brasileira. 
            Seu tom deve ser profissional, tecnológico e prestativo.
            Serviços da empresa: Rastreamento em tempo real, bloqueio remoto, histórico de rotas, cerca eletrônica, monitoramento 24h.
            Preços: Peça para o cliente entrar em contato com o comercial no número 81 98593-8044 para cotação personalizada.
            Locais atendidos: Todo o Brasil.
            Não responda sobre assuntos fora de rastreamento veicular e segurança.
            Mantenha as respostas curtas e objetivas.
          `,
        }
      });

      const botText = response.text || 'Desculpe, tive um problema ao processar sua pergunta. Pode tentar novamente?';
      setMessages(prev => [...prev, { role: 'bot', text: botText }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'bot', text: 'Ocorreu um erro na conexão. Por favor, fale conosco pelo WhatsApp para um atendimento imediato.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 w-14 h-14 bg-secondary text-white rounded-full flex items-center justify-center shadow-xl hover:scale-110 transition-transform z-40 border-2 border-primary"
      >
        <span className="material-icons-round text-3xl">{isOpen ? 'close' : 'smart_toy'}</span>
      </button>

      {isOpen && (
        <div className="fixed bottom-40 right-6 w-[350px] max-w-[calc(100vw-3rem)] h-[500px] bg-white rounded-[2rem] shadow-2xl z-50 overflow-hidden flex flex-col border border-slate-200 animate-fade-in-up">
          <div className="bg-secondary p-6 text-white flex items-center gap-3">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center p-1">
              <img src={logoUrl} className="w-full h-full object-contain" alt="Logo" />
            </div>
            <div>
              <p className="font-bold">Assistente 3A</p>
              <p className="text-[10px] text-emerald-400 flex items-center gap-1 font-bold uppercase tracking-wider">
                <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse"></span>
                Online Agora
              </p>
            </div>
          </div>

          <div ref={chatRef} className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50">
            {messages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-2xl text-sm font-medium shadow-sm ${msg.role === 'user' ? 'bg-primary text-secondary rounded-tr-none' : 'bg-white text-slate-700 rounded-tl-none'
                  }`}>
                  {msg.text}
                </div>
              </div>
            ))}
            {isLoading && (
              <div className="flex justify-start">
                <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm flex gap-1">
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce"></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.2s]"></div>
                  <div className="w-1.5 h-1.5 bg-slate-300 rounded-full animate-bounce [animation-delay:0.4s]"></div>
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-white border-t border-slate-100 flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Digite sua dúvida..."
              className="flex-1 bg-slate-100 border-none rounded-xl px-4 text-sm focus:ring-2 focus:ring-primary"
            />
            <button
              onClick={handleSend}
              className="w-10 h-10 bg-secondary text-white rounded-xl flex items-center justify-center hover:bg-slate-900 transition-colors"
            >
              <span className="material-icons-round text-lg">send</span>
            </button>
          </div>
        </div>
      )}
    </>
  );
};
