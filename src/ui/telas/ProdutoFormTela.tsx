import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { db, type Item } from '../../data/db';
import { capturarVideo, prepararArquivo } from '../../data/fotos';
import { apagarFoto, definirItemAtivo, grupoAtivo, guardarFoto, salvarItem } from '../../data/repositorios';
import { ehMultiploDaMenorMoeda, formatar, formatarSemSimbolo, lerReais } from '../../domain/dinheiro';
import { inicialAposAjuste } from '../../domain/estoque';
import { Cores, corGrupo } from '../cores';
import { CampoTexto, Chave, Janela } from '../componentes/Dialogos';
import { FaixaAviso, Tela } from '../componentes/Estrutura';
import { FotoProduto } from '../componentes/FotoProduto';
import { Icone } from '../componentes/Icone';
import { TeclaSecundaria, TeclaTexto } from '../componentes/Tecla';
import { useConsulta } from '../dados';

export function ProdutoFormTela() {
  const { id } = useParams();
  const itemId = Number(id) || 0;
  const novo = itemId === 0;
  const navegar = useNavigate();
  const voltar = () => navegar(-1);
  const { valor: grupo } = useConsulta(() => grupoAtivo(db));
  const cor = corGrupo(grupo?.corIndex ?? 0);

  const [original, setOriginal] = useState<Item | null>(null);
  const [carregado, setCarregado] = useState(novo);
  const [fotoId, setFotoId] = useState<number | null>(null);
  const [nome, setNome] = useState('');
  const [preco, setPreco] = useState('');
  const [controla, setControla] = useState(false);
  const [quantidade, setQuantidade] = useState('');
  const [processandoFoto, setProcessandoFoto] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [webcam, setWebcam] = useState(false);
  const arquivoRef = useRef<HTMLInputElement>(null);
  const fotoNaoSalva = useRef<number | null>(null);

  useEffect(() => {
    if (novo) return;
    let vivo = true;
    void db.itens.get(itemId).then((i) => {
      if (!vivo) return;
      if (i) {
        setOriginal(i);
        setFotoId(i.fotoId);
        setNome(i.nome);
        setPreco(formatarSemSimbolo(i.precoCentavos));
        setControla(i.controlaEstoque);
        setQuantidade(i.qtdDisponivel != null ? String(i.qtdDisponivel) : '');
      }
      setCarregado(true);
    });
    return () => {
      vivo = false;
    };
  }, [itemId, novo]);

  useEffect(
    () => () => {
      if (fotoNaoSalva.current != null) void apagarFoto(db, fotoNaoSalva.current);
    },
    [],
  );

  const usarFoto = async (gerar: () => Promise<Blob>) => {
    setProcessandoFoto(true);
    setErro(null);
    try {
      const blob = await gerar();
      const novoId = await guardarFoto(db, blob);
      if (fotoNaoSalva.current != null) await apagarFoto(db, fotoNaoSalva.current);
      fotoNaoSalva.current = novoId;
      setFotoId(novoId);
    } catch (e) {
      console.warn('Vendinha: falha ao preparar a foto', e);
      setErro('Não deu para usar essa foto. Tente outra.');
    } finally {
      setProcessandoFoto(false);
    }
  };

  const tirarFoto = async () => {
    if (fotoNaoSalva.current != null) {
      await apagarFoto(db, fotoNaoSalva.current);
      fotoNaoSalva.current = null;
    }
    setFotoId(null);
  };

  const precoCentavos = lerReais(preco);

  const salvar = async () => {
    const q = /^\d+$/.test(quantidade) ? Number(quantidade) : null;
    const p = precoCentavos;
    const msg = !nome.trim()
      ? 'Falta o nome do produto.'
      : p == null || p <= 0
        ? 'Escreva o preço. Ex.: 2,50'
        : !ehMultiploDaMenorMoeda(p)
          ? 'Use um preço que dá para pagar com moedas: termina em 0 ou 5 centavos.'
          : controla && (q == null || q < 0 || (original == null && q === 0))
            ? 'Escreva quantos vocês têm.'
            : null;
    setErro(msg);
    if (msg || p == null) return;
    let inicial: number | null = null;
    let disponivel: number | null = null;
    if (controla && q != null) {
      if (original && original.controlaEstoque) {
        inicial = inicialAposAjuste(original.qtdInicial, original.qtdDisponivel, q);
      } else {
        inicial = q;
      }
      disponivel = q;
    }
    setSalvando(true);
    await salvarItem(db, {
      id: original?.id,
      nome: nome.trim(),
      fotoId,
      precoCentavos: p,
      controlaEstoque: controla,
      qtdInicial: inicial,
      qtdDisponivel: disponivel,
      ativo: original?.ativo ?? true,
    });
    fotoNaoSalva.current = null;
    voltar();
  };

  const alternarAtivo = async () => {
    if (!original) return;
    await definirItemAtivo(db, original.id, !original.ativo);
    voltar();
  };

  return (
    <Tela titulo={novo ? 'Novo item' : 'Editar item'} onVoltar={voltar}>
      <div className="rolagem">
        {carregado && (
          <div className="form-produto">
            <div className="form-produto-foto pilha" style={{ '--vao': '12px' } as React.CSSProperties}>
              <div className="area-foto" style={{ borderColor: fotoId == null ? Cores.linha : 'transparent' }}>
                {fotoId != null ? (
                  <FotoProduto fotoId={fotoId} nome={nome || 'produto'} corGrupo={cor} raio={24} />
                ) : (
                  <button type="button" className="area-foto-vazia" onClick={() => setWebcam(true)}>
                    <FotoProduto fotoId={null} nome={nome || '?'} corGrupo={cor} tamanho={120} raio={20} rotulo={false} />
                    <span className="t-hs c-tinta" style={{ marginTop: 10 }}>
                      Foto do produto (opcional)
                    </span>
                    <span className="t-bm c-apoio">Sem foto, aparece a inicial do nome.</span>
                  </button>
                )}
                {processandoFoto && (
                  <div className="area-foto-carregando" role="status" aria-label="Preparando a foto">
                    <span className="girando" />
                  </div>
                )}
              </div>
              <div className="linha">
                <div className="peso-1">
                  <TeclaTexto
                    texto={fotoId == null ? 'Usar a webcam' : 'Trocar foto'}
                    icone="camera"
                    onClick={() => setWebcam(true)}
                    cor={Cores.azul}
                    corConteudo="#FFFFFF"
                    habilitada={!processandoFoto}
                  />
                </div>
                <div className="peso-1">
                  <TeclaSecundaria texto="Escolher arquivo" icone="galeria" onClick={() => arquivoRef.current?.click()} habilitada={!processandoFoto} />
                </div>
              </div>
              {fotoId != null && (
                <TeclaSecundaria texto="Tirar a foto" icone="lixeira" corTexto={Cores.erro} onClick={() => void tirarFoto()} alturaMinima={56} />
              )}
              <input
                ref={arquivoRef}
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  e.target.value = '';
                  if (f) void usarFoto(() => prepararArquivo(f));
                }}
              />
            </div>

            <div className="form-produto-campos pilha">
              <CampoTexto valor={nome} onMudar={(v) => setNome(v.slice(0, 40))} rotulo="Nome" exemplo="Ex.: Geladinho de morango" maximo={40} autoFoco={novo} />
              <CampoTexto
                valor={preco}
                onMudar={(t) => setPreco(t.replace(/[^\d,.]/g, '').slice(0, 9))}
                rotulo="Preço (R$)"
                exemplo="Ex.: 2,50"
                modo="decimal"
                ajuda={precoCentavos != null ? `Vai custar ${formatar(precoCentavos)}` : null}
                onEnter={() => void salvar()}
              />
              <Chave ligada={controla} onMudar={setControla}>
                <span className="t-tl c-tinta" style={{ display: 'block' }}>
                  Controlar quantidade?
                </span>
                <span className="t-bm c-apoio" style={{ display: 'block' }}>
                  {controla ? 'O app conta e avisa quando estiver acabando.' : 'Vende sem limite. Bom para fatias de bolo.'}
                </span>
              </Chave>
              {controla && (
                <CampoTexto
                  valor={quantidade}
                  onMudar={(t) => setQuantidade(t.replace(/\D/g, '').slice(0, 4))}
                  rotulo={novo || !original?.controlaEstoque ? 'Quantos vocês têm?' : 'Quantos têm agora?'}
                  exemplo="20"
                  modo="numeric"
                  ajuda={original?.controlaEstoque ? `Agora restam ${original.qtdDisponivel ?? 0}. Chegou mais? Escreva o total.` : null}
                  onEnter={() => void salvar()}
                />
              )}
              {erro && <FaixaAviso texto={erro} tipo="erro" />}
              <TeclaTexto
                texto="Salvar item"
                icone="ok"
                onClick={() => void salvar()}
                cor={Cores.verde}
                corConteudo="#FFFFFF"
                alturaMinima={76}
                habilitada={!salvando && !processandoFoto}
              />
              {original && (
                <>
                  <TeclaSecundaria
                    texto={original.ativo ? 'Desativar item' : 'Ativar item de novo'}
                    onClick={() => void alternarAtivo()}
                    corTexto={original.ativo ? Cores.erro : Cores.verdeTexto}
                  />
                  {original.ativo && (
                    <p className="t-bm c-apoio" style={{ textAlign: 'center' }}>
                      Desativar tira o item da tela de venda. As vendas feitas continuam no histórico.
                    </p>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </div>
      {webcam && (
        <DialogoWebcam
          onFechar={() => setWebcam(false)}
          onCapturar={(video) => {
            setWebcam(false);
            void usarFoto(() => capturarVideo(video));
          }}
          onEscolherArquivo={() => {
            setWebcam(false);
            arquivoRef.current?.click();
          }}
        />
      )}
    </Tela>
  );
}

function DialogoWebcam({
  onFechar,
  onCapturar,
  onEscolherArquivo,
}: {
  onFechar: () => void;
  onCapturar: (video: HTMLVideoElement) => void;
  onEscolherArquivo: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [estado, setEstado] = useState<'abrindo' | 'pronta' | 'erro'>('abrindo');
  const [mensagem, setMensagem] = useState('');

  useEffect(() => {
    let fluxo: MediaStream | null = null;
    let vivo = true;
    (async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setEstado('erro');
        setMensagem('Este computador não tem webcam. Use Escolher arquivo.');
        return;
      }
      try {
        fluxo = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 960 }, facingMode: 'environment' },
          audio: false,
        });
        if (!vivo) {
          fluxo.getTracks().forEach((t) => t.stop());
          return;
        }
        const v = videoRef.current;
        if (v) {
          v.srcObject = fluxo;
          await v.play().catch(() => undefined);
        }
        setEstado('pronta');
      } catch (e) {
        if (!vivo) return;
        const nome = e instanceof DOMException ? e.name : '';
        setEstado('erro');
        setMensagem(
          nome === 'NotAllowedError' || nome === 'SecurityError'
            ? 'O navegador não deixou usar a webcam. Clique no cadeado da barra de endereço, permita a câmera e tente de novo.'
            : nome === 'NotFoundError' || nome === 'OverconstrainedError'
              ? 'Este computador não tem webcam. Use Escolher arquivo.'
              : 'Não deu para abrir a webcam. Feche outros programas que usam a câmera e tente de novo.',
        );
      }
    })();
    return () => {
      vivo = false;
      fluxo?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capturar = () => {
    const v = videoRef.current;
    if (v && estado === 'pronta' && v.videoWidth > 0) onCapturar(v);
  };

  return (
    <Janela onFechar={onFechar} largura={560} rotulo="Tirar foto do produto">
      <h2 className="t-hs c-tinta">Tirar foto do produto</h2>
      <div className="webcam" style={{ marginTop: 14 }}>
        <video ref={videoRef} playsInline muted aria-label="Prévia da webcam" />
        {estado === 'abrindo' && (
          <div className="webcam-aviso">
            <span className="girando" />
          </div>
        )}
        {estado === 'erro' && (
          <div className="webcam-aviso">
            <Icone nome="camera" tamanho={56} cor={Cores.apoio} />
          </div>
        )}
      </div>
      {estado === 'erro' && (
        <div style={{ marginTop: 12 }}>
          <FaixaAviso texto={mensagem} tipo="erro" />
        </div>
      )}
      <p className="t-bm c-apoio" style={{ marginTop: 10 }}>
        Só o quadrado do meio vira a foto. Coloque o produto bem no centro.
      </p>
      <div className="linha" style={{ marginTop: 16 }}>
        <div className="peso-1">
          <TeclaSecundaria texto={estado === 'erro' ? 'Escolher arquivo' : 'Cancelar'} onClick={estado === 'erro' ? onEscolherArquivo : onFechar} />
        </div>
        <div className="peso-1">
          <TeclaTexto texto="Capturar" icone="camera" onClick={capturar} cor={Cores.azul} corConteudo="#FFFFFF" habilitada={estado === 'pronta'} />
        </div>
      </div>
    </Janela>
  );
}
