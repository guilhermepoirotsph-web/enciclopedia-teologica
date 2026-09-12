import * as THREE from 'three';

/**
 * "A Rosácea" — o vitral do hero.
 *
 * Uma rosácea gótica de ouro girando devagar dentro de uma nave escura, com
 * feixes de luz e poeira dourada subindo. O scroll aproxima a câmera até
 * atravessar o vitral, que é a metáfora do site inteiro: entrar pela porta
 * da luz para chegar ao texto.
 *
 * Decisões que valem a pena registrar:
 *  - Tudo que se repete (pétalas, raios) é InstancedMesh: 3 draw calls em vez
 *    de 40, porque o hero roda em celular de cliente, não em placa de vídeo.
 *  - O canvas é transparente. O fundo profundo vem do CSS — assim, se o WebGL
 *    não subir, a tela continua sendo uma nave escura e não um retângulo branco.
 *  - Nada aqui depende de prefers-reduced-motion: no Windows do Guilherme a
 *    opção "efeitos de animação" vem desligada e o site inteiro cairia no
 *    caminho estático. Quem desliga é `?anim=0` na URL, de propósito.
 */

export type Rosacea = {
  /** 0 no topo da página, 1 quando o hero terminou de sair */
  setProgresso: (p: number) => void;
  destruir: () => void;
};

const OURO = 0xc9a24a;
const OURO_LUZ = 0xe9ce8b;

/** Textura de brilho radial gerada no canvas — sem arquivo, sem requisição. */
function texturaBrilho(): THREE.Texture {
  const t = document.createElement('canvas');
  t.width = t.height = 128;
  const c = t.getContext('2d')!;
  const g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, 'rgba(255,236,190,1)');
  g.addColorStop(0.25, 'rgba(233,206,139,0.55)');
  g.addColorStop(1, 'rgba(201,162,74,0)');
  c.fillStyle = g;
  c.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(t);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function montarRosacea(hospedeiro: HTMLElement): Rosacea | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ alpha: true, antialias: window.devicePixelRatio < 1.6, powerPreference: 'high-performance' });
  } catch {
    return null; // sem WebGL: o CSS por baixo já entrega a nave escura
  }

  const larg = () => hospedeiro.clientWidth || window.innerWidth;
  const alt = () => hospedeiro.clientHeight || window.innerHeight;

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(larg(), alt());
  renderer.setClearColor(0x000000, 0);
  renderer.domElement.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;display:block';
  hospedeiro.appendChild(renderer.domElement);

  const cena = new THREE.Scene();
  cena.fog = new THREE.FogExp2(0x05070b, 0.085);

  const camera = new THREE.PerspectiveCamera(46, larg() / alt(), 0.1, 90);
  camera.position.set(0, 0, 8.6);

  /* ------------------------------------------------------------ materiais */

  const ouro = new THREE.MeshStandardMaterial({
    color: OURO,
    metalness: 0.95,
    roughness: 0.28,
    emissive: new THREE.Color(0x3a2a0c),
    emissiveIntensity: 0.55,
  });
  const ouroClaro = new THREE.MeshStandardMaterial({
    color: OURO_LUZ,
    metalness: 0.9,
    roughness: 0.2,
    emissive: new THREE.Color(0x5c440f),
    emissiveIntensity: 0.8,
  });

  const descartaveis: Array<{ dispose: () => void }> = [ouro, ouroClaro];
  const reg = <T extends { dispose: () => void }>(x: T) => {
    descartaveis.push(x);
    return x;
  };

  /* ------------------------------------------------------------ rosácea */

  const rosacea = new THREE.Group();
  // A rosácea é FUNDO, não protagonista: fica recuada para o título respirar na
  // frente dela. Quem traz o vitral para perto é o scroll.
  rosacea.position.z = -0.9;
  cena.add(rosacea);

  // dois anéis concêntricos: a borda do vitral e o miolo
  const anelExterno = new THREE.Mesh(reg(new THREE.TorusGeometry(3.62, 0.045, 10, 128)), ouro);
  const anelMeio = new THREE.Mesh(reg(new THREE.TorusGeometry(2.98, 0.026, 8, 110)), ouro);
  const anelInterno = new THREE.Mesh(reg(new THREE.TorusGeometry(1.28, 0.038, 10, 90)), ouroClaro);
  rosacea.add(anelExterno, anelMeio, anelInterno);

  // 12 pétalas — as doze tribos / os doze apóstolos
  const PETALAS = 12;
  const petalas = new THREE.InstancedMesh(reg(new THREE.TorusGeometry(0.58, 0.028, 8, 48)), ouro, PETALAS);
  const m = new THREE.Matrix4();
  const eixoZ = new THREE.Vector3(0, 0, 1);
  for (let i = 0; i < PETALAS; i++) {
    const a = (i / PETALAS) * Math.PI * 2;
    m.makeRotationAxis(eixoZ, a);
    m.setPosition(Math.cos(a) * 2.13, Math.sin(a) * 2.13, 0);
    petalas.setMatrixAt(i, m);
  }
  petalas.instanceMatrix.needsUpdate = true;
  rosacea.add(petalas);

  // 24 raios finos ligando o miolo à borda
  const RAIOS = 24;
  const raios = new THREE.InstancedMesh(reg(new THREE.BoxGeometry(1.62, 0.022, 0.022)), ouro, RAIOS);
  for (let i = 0; i < RAIOS; i++) {
    const a = (i / RAIOS) * Math.PI * 2;
    m.makeRotationAxis(eixoZ, a);
    m.setPosition(Math.cos(a) * 2.2, Math.sin(a) * 2.2, 0);
    raios.setMatrixAt(i, m);
  }
  raios.instanceMatrix.needsUpdate = true;
  rosacea.add(raios);

  // 6 lóbulos internos
  const LOBULOS = 6;
  const lobulos = new THREE.InstancedMesh(reg(new THREE.TorusGeometry(0.42, 0.022, 8, 36)), ouroClaro, LOBULOS);
  for (let i = 0; i < LOBULOS; i++) {
    const a = (i / LOBULOS) * Math.PI * 2 + Math.PI / 6;
    m.makeRotationAxis(eixoZ, a);
    m.setPosition(Math.cos(a) * 0.86, Math.sin(a) * 0.86, 0);
    lobulos.setMatrixAt(i, m);
  }
  lobulos.instanceMatrix.needsUpdate = true;
  rosacea.add(lobulos);

  /* ------------------------------------------------------------ o núcleo de luz */

  const brilho = texturaBrilho();
  descartaveis.push(brilho);

  // O miolo brilha, mas com parcimônia: é exatamente atrás dele que o título
  // da página vai ser lido. Luz demais aqui apaga a tipografia.
  const nucleo = new THREE.Sprite(
    reg(new THREE.SpriteMaterial({ map: brilho, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.55 }))
  );
  nucleo.scale.set(2.7, 2.7, 1);
  rosacea.add(nucleo);

  const halo = new THREE.Sprite(
    reg(new THREE.SpriteMaterial({ map: brilho, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.16 }))
  );
  halo.scale.set(13, 13, 1);
  halo.position.z = -5;
  cena.add(halo);

  /* ------------------------------------------------------------ poeira de ouro */

  const N = 1100;
  const pos = new Float32Array(N * 3);
  const vel = new Float32Array(N);
  for (let i = 0; i < N; i++) {
    const r = 1.2 + Math.random() * 7;
    const a = Math.random() * Math.PI * 2;
    pos[i * 3] = Math.cos(a) * r;
    pos[i * 3 + 1] = -6 + Math.random() * 12;
    pos[i * 3 + 2] = -4 + Math.random() * 7;
    vel[i] = 0.0018 + Math.random() * 0.006;
  }
  const geoPo = reg(new THREE.BufferGeometry());
  geoPo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const poeira = new THREE.Points(
    geoPo,
    reg(
      new THREE.PointsMaterial({
        color: OURO_LUZ,
        size: 0.045,
        map: brilho,
        transparent: true,
        opacity: 0.85,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        sizeAttenuation: true,
      })
    )
  );
  cena.add(poeira);

  /* ------------------------------------------------------------ feixes de luz */

  const feixes = new THREE.Group();
  const geoFeixe = reg(new THREE.PlaneGeometry(1.5, 16));
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(
      geoFeixe,
      reg(
        new THREE.MeshBasicMaterial({
          map: brilho,
          color: OURO_LUZ,
          transparent: true,
          opacity: 0.07,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
        })
      )
    );
    f.position.z = -2.5 - i * 0.6;
    f.rotation.z = (i - 1) * 0.42;
    feixes.add(f);
  }
  cena.add(feixes);

  /* ------------------------------------------------------------ luz */

  cena.add(new THREE.AmbientLight(0x6e7ba0, 0.55));
  const pontual = new THREE.PointLight(0xffd9a0, 26, 24, 2);
  pontual.position.set(0, 0, 1.6);
  cena.add(pontual);
  const direcional = new THREE.DirectionalLight(0xbcd0ff, 1.1);
  direcional.position.set(-4, 6, 5);
  cena.add(direcional);

  /* ------------------------------------------------------------ interação */

  let alvoX = 0;
  let alvoY = 0;
  let mouseX = 0;
  let mouseY = 0;
  let progresso = 0;

  const aoMover = (e: PointerEvent) => {
    alvoX = (e.clientX / window.innerWidth - 0.5) * 2;
    alvoY = (e.clientY / window.innerHeight - 0.5) * 2;
  };
  window.addEventListener('pointermove', aoMover, { passive: true });

  const aoRedimensionar = () => {
    camera.aspect = larg() / alt();
    camera.updateProjectionMatrix();
    renderer.setSize(larg(), alt());
  };
  window.addEventListener('resize', aoRedimensionar);

  /* Pausa quando a aba sai de foco — não faz sentido girar um vitral que
     ninguém está vendo, e o notebook do visitante agradece. */
  let visivel = !document.hidden;
  const aoVisibilidade = () => {
    visivel = !document.hidden;
  };
  document.addEventListener('visibilitychange', aoVisibilidade);

  /* Se o navegador derrubar o contexto WebGL, o laço para em vez de vomitar
     erro a 60 vezes por segundo. */
  let vivo = true;
  const aoPerderContexto = (e: Event) => {
    e.preventDefault();
    vivo = false;
  };
  renderer.domElement.addEventListener('webglcontextlost', aoPerderContexto);

  /* ------------------------------------------------------------ laço */

  const relogio = new THREE.Clock();
  let quadro = 0;

  const laco = () => {
    quadro = requestAnimationFrame(laco);
    if (!vivo || !visivel) return;

    const t = relogio.getElapsedTime();
    const dt = Math.min(relogio.getDelta(), 0.05);

    rosacea.rotation.z += 0.00085 + progresso * 0.0022;
    petalas.rotation.z -= 0.0011;
    lobulos.rotation.z += 0.0019;
    anelMeio.rotation.z -= 0.0006;

    // a rosácea respira
    const pulso = 1 + Math.sin(t * 0.7) * 0.012;
    rosacea.scale.setScalar(pulso);
    nucleo.scale.setScalar(2.6 + Math.sin(t * 1.1) * 0.26);
    (nucleo.material as THREE.SpriteMaterial).opacity = 0.5 + Math.sin(t * 1.6) * 0.1;

    feixes.rotation.z = Math.sin(t * 0.12) * 0.16;

    // poeira subindo e reciclando embaixo
    const p = geoPo.attributes.position as THREE.BufferAttribute;
    const a = p.array as Float32Array;
    for (let i = 0; i < N; i++) {
      a[i * 3 + 1] += vel[i] * 60 * dt;
      if (a[i * 3 + 1] > 6) a[i * 3 + 1] = -6;
    }
    p.needsUpdate = true;
    poeira.rotation.y += 0.0004;

    // paralaxe suave + mergulho pelo scroll
    mouseX += (alvoX - mouseX) * 0.045;
    mouseY += (alvoY - mouseY) * 0.045;
    camera.position.x = mouseX * 0.5;
    camera.position.y = -mouseY * 0.34;
    camera.position.z = 8.6 - progresso * 6.4;
    camera.lookAt(0, 0, -0.9);

    renderer.render(cena, camera);
  };
  laco();

  return {
    setProgresso: (v: number) => {
      progresso = Math.max(0, Math.min(1, v));
    },
    destruir() {
      vivo = false;
      cancelAnimationFrame(quadro);
      window.removeEventListener('pointermove', aoMover);
      window.removeEventListener('resize', aoRedimensionar);
      document.removeEventListener('visibilitychange', aoVisibilidade);
      renderer.domElement.removeEventListener('webglcontextlost', aoPerderContexto);
      descartaveis.forEach((d) => d.dispose());
      renderer.dispose();
      renderer.domElement.remove();
    },
  };
}
