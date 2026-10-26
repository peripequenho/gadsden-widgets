/**
 * El idioma del panel: portugués de Brasil si la tienda es de Brasil (Nuvemshop), español en el resto. Un diccionario
 * plano, la clave es el texto en español: `t("Guardar y publicar")`. Lo que no está en `PT` sale en español (el test
 * textos.test.ts lo evita). Los términos son los del admin de Nuvemshop (Editar layout, Adicionar seção, Salvar e
 * publicar...), medidos en su ayuda pública el 25-oct; los no medidos están en BUILD.md con [VERIFICAR].
 */

export type Idioma = "es" | "pt";
export let idioma: Idioma = "es";

/** Lo que devuelve getStoreInfo de Nexo (country "BR", language "pt"); sin Nexo, el idioma del navegador. */
export function fijarIdioma(info?: { country?: string; language?: string }) {
  const lengua = info ? info.language ?? "" : globalThis.navigator?.language ?? "";
  idioma = info?.country === "BR" || /^pt/i.test(lengua) ? "pt" : "es";
  if (globalThis.document) document.documentElement.lang = idioma === "pt" ? "pt-BR" : "es";
}

/** El texto en el idioma del panel; `{x}` se reemplaza por `vars.x`. */
export function t(es: string, vars: Record<string, string | number> = {}) {
  const s = (idioma === "pt" && PT[es]) || es;
  return s.replace(/\{(\w+)\}/g, (m, k: string) => (k in vars ? String(vars[k]) : m));
}

export const PT: Record<string, string> = {
  // inicio.tsx
  "Ofertas, adicionales, regalos, reseñas y popups en tu tienda, sin tocar código.": "Ofertas, adicionais, brindes, avaliações e pop-ups na sua loja, sem mexer em código.",
  "TicketUp: ofertas post compra": "TicketUp: ofertas pós-compra",
  "Después de pagar, tu comprador ve una oferta en la página de éxito y suma un producto a su mismo pedido pagando sólo la diferencia con Mercado Pago. Gratis.":
    "Depois de pagar, seu cliente vê uma oferta na página de confirmação e adiciona um produto ao mesmo pedido pagando só a diferença com o Mercado Pago. Grátis.",
  "Conocer TicketUp": "Conhecer o TicketUp",
  "¿Dudas? Escribinos a": "Dúvidas? Escreva para",
  "Editar widgets": "Editar widgets",
  "Todavía no agregaste widgets": "Você ainda não adicionou widgets",
  "Abrí el editor, elegí un lugar de tu tienda y agregá el primero. Lo ves al instante y se publica cuando tocás Guardar y publicar.":
    "Abra o editor, escolha um lugar da sua loja e adicione o primeiro. Você vê na hora, e ele é publicado quando você clica em Salvar e publicar.",
  "Agregar mi primer widget": "Adicionar meu primeiro widget",
  "Tus widgets": "Seus widgets",
  "{n} publicado": "{n} publicado",
  "{n} publicados": "{n} publicados",
  "{n} oculto": "{n} oculto",
  "{n} ocultos": "{n} ocultos",
  "Para agregar, mover o cambiar widgets, abrí el editor: es igual al de Editar diseño de Tiendanube.":
    "Para adicionar, mover ou alterar widgets, abra o editor: é igual ao Editar layout da Nuvemshop.",
  "No pudimos abrir Gadsden Widgets": "Não foi possível abrir o Gadsden Widgets",
  "Recargar": "Recarregar",

  // main.tsx: mensajes
  "Conectando...": "Conectando...",
  "Cargando...": "Carregando...",
  "Abrí esta app desde el administrador de tu tienda: Mis aplicaciones > Gadsden Widgets.": "Abra este aplicativo pelo painel da sua loja: Meus aplicativos > Gadsden Widgets.",
  "La sesión no es válida: volvé a abrir la app desde el admin.": "A sessão não é válida: abra o aplicativo de novo pelo painel.",
  "No se pudo cargar la configuración ({x}).": "Não foi possível carregar a configuração ({x}).",
  "Guardado: ya se ve en tu tienda.": "Salvo: já aparece na sua loja.",
  "No se pudo guardar ({x}).": "Não foi possível salvar ({x}).",
  "Vista previa: {x}": "Pré-visualização: {x}",
  "{x} no puede ir en ese lugar.": "{x} não pode ficar nesse lugar.",
  "Código copiado.": "Código copiado.",
  "Copiar código": "Copiar código",
  "{n} unidades, {p} %": "{n} unidades, {p} %",
  "{n} unidades, ${x} menos": "{n} unidades, R$ {x} a menos",
  "**El descuento lo cobra tu tienda, no el widget.** Creá una promoción por cantidad en **Descuentos > Promociones** con los mismos descuentos: {x}.":
    "**Quem cobra o desconto é a sua loja, não o widget.** Crie uma promoção por quantidade em **Descontos > Promoções** com os mesmos descontos: {x}.",

  // main.tsx: modales y menús
  "Cerrar": "Fechar",
  "Abrir": "Abrir",
  "Buscar": "Buscar",
  "Buscar...": "Buscar...",
  "Agregar": "Adicionar",
  "Agregar sección": "Adicionar seção",
  "Agregar bloque": "Adicionar bloco",
  "Agregar {x}": "Adicionar {x}",
  "bloque": "bloco",
  "Agregar acá": "Adicionar aqui",
  "No hay widgets para este lugar con ese nombre.": "Não há widgets para este lugar com esse nome.",
  "No hay bloques con ese nombre.": "Não há blocos com esse nome.",
  "Se arma con tus fotos, videos o productos.": "Montado com suas fotos, vídeos ou produtos.",
  "Básico": "Básico",
  "Diseño": "Design",
  "Otros": "Outros",
  "Editar plantilla": "Editar modelo",
  "Crear plantilla": "Criar modelo",
  "Nombre": "Nome",
  "Por ejemplo, Remeras": "Por exemplo, Camisetas",
  "Productos que usan esta plantilla": "Produtos que usam este modelo",
  "Sacar {x}": "Remover {x}",
  "Buscá un producto": "Busque um produto",
  "Los demás productos usan la plantilla base. Si un producto ya estaba en otra plantilla, pasa a esta.":
    "Os outros produtos usam o modelo base. Se um produto já estava em outro modelo, ele passa para este.",
  "¿Seguro? Se borran sus widgets": "Tem certeza? Os widgets dele serão excluídos",
  "Eliminar plantilla": "Excluir modelo",
  "Cancelar": "Cancelar",
  "Guardar": "Salvar",
  "Crear": "Criar",
  "¿Querés salir sin guardar los cambios?": "Deseja sair sem salvar as alterações?",
  "Al salir, vas a perder los cambios que no guardaste.": "Ao sair, você vai perder as alterações que não salvou.",
  "No, quiero guardar los cambios": "Não, quero salvar as alterações",
  "Sí, quiero salir": "Sim, quero sair",

  // main.tsx: el árbol
  "Encabezado": "Cabeçalho",
  "Pie de página": "Rodapé",
  "Fijos en la pantalla": "Fixos na tela",
  "En otras páginas": "Em outras páginas",
  "sólo con código": "só com código",
  "versión anterior": "versão anterior",
  "debajo de las fotos": "abaixo das fotos",
  "Multimedia": "Mídia",
  "Información de compra": "Informações de compra",
  "Es de tu theme: se edita en Editar diseño": "É do seu layout: edite em Editar layout",
  "Eliminar": "Excluir",
  "Duplicar": "Duplicar",
  "Renombrar": "Renomear",
  "Mostrar": "Mostrar",
  "Ocultar": "Ocultar",
  "Más opciones": "Mais opções",

  // main.tsx: ajustes globales
  "Ajustes globales": "Configurações globais",
  "Cerrar ajustes": "Fechar configurações",
  "Estilo y colores": "Estilo e cores",
  "Código para pegar": "Código para colar",
  "Precios con descuento": "Preços com desconto",
  "Estilo de los widgets": "Estilo dos widgets",
  "El de mi tienda": "O da minha loja",
  "Clásico de Gadsden": "Clássico do Gadsden",
  "Oscuro": "Escuro",
  "Colores": "Cores",
  "Fondo": "Fundo",
  "Texto": "Texto",
  "Botón": "Botão",
  "Texto del botón": "Texto do botão",
  "Tipografía": "Tipografia",
  "Letra del texto": "Fonte do texto",
  "El nombre en Google Fonts (por ejemplo, Inter). Vacío: la del sistema.": "O nome no Google Fonts (por exemplo, Inter). Vazio: a do sistema.",
  "Letra de los títulos": "Fonte dos títulos",
  "Grosor de los títulos": "Espessura dos títulos",
  "Para poner un widget en cualquier lugar desde Editar diseño: agregá una sección **Personalizada** con un bloque **Código** y pegá el código del widget.":
    "Para colocar um widget em qualquer lugar pelo Editar layout: adicione uma seção **Personalizada** com um bloco **Código** e cole o código do widget.",
  "Todavía no hay widgets.": "Ainda não há widgets.",
  "Los widgets que muestran un precio con descuento (ofertas por cantidad, combos, planes) no cambian lo que cobra el carrito: el descuento lo aplica tu tienda. Creá la promoción en **Descuentos > Promociones**, con los mismos porcentajes que pusiste en el widget.":
    "Os widgets que mostram um preço com desconto (ofertas por quantidade, combos, planos) não mudam o que o carrinho cobra: quem aplica o desconto é a sua loja. Crie a promoção em **Descontos > Promoções**, com as mesmas porcentagens que você colocou no widget.",

  // main.tsx: la derecha
  "Seleccioná una sección o bloque para editar sus ajustes": "Selecione uma seção ou bloco para editar as configurações",
  "Esta sección es de tu theme: sus ajustes se editan en **Tienda online > Diseño > Editar diseño**. Acá podés poner widgets arriba o abajo de ella: usá la línea entre dos filas del árbol o arrastrá un widget sobre esta fila.":
    "Esta seção é do seu layout: as configurações dela ficam em **Loja online > Layout > Editar layout**. Aqui você pode colocar widgets acima ou abaixo dela: use a linha entre duas linhas da árvore ou arraste um widget sobre esta linha.",
  "Es un widget de la versión anterior: no tiene ajustes. Podés eliminarlo y agregar el de Gadsden equivalente.":
    "É um widget da versão anterior: não tem configurações. Você pode excluí-lo e adicionar o equivalente do Gadsden.",
  "Ubicación": "Localização",
  "Dónde va": "Onde fica",
  "Un lugar de otra página": "Um lugar de outra página",
  "Sólo donde pegue su código": "Só onde eu colar o código",

  // main.tsx: la barra de arriba
  "Inicio": "Início",
  "Producto": "Produto",
  "Categoría": "Categoria",
  "Búsqueda": "Busca",
  "Buscar plantillas...": "Buscar modelos...",
  "Plantilla base": "Modelo base",
  "Plantillas": "Modelos",
  "{n} producto": "{n} produto",
  "{n} productos": "{n} produtos",
  "Editar {x}": "Editar {x}",
  "Previsualizar:": "Pré-visualizar:",
  "Buscar productos...": "Buscar produtos...",
  "Escribí para buscar un producto.": "Digite para buscar um produto.",
  "Celular": "Celular",
  "Computadora": "Computador",
  "Deshacer": "Desfazer",
  "Rehacer": "Refazer",
  "Salir de pantalla completa": "Sair da tela cheia",
  "Pantalla completa": "Tela cheia",
  "Ver en la tienda": "Ver na loja",
  "Ver en la tienda (lo publicado)": "Ver na loja (o que está publicado)",
  "Sin publicar": "Não publicado",
  "Publicado": "Publicado",
  "Publicando...": "Publicando...",
  "Guardar y publicar": "Salvar e publicar",
  "Cargando la página...": "Carregando a página...",
  "Vista previa de la página": "Pré-visualização da página",
  "Ver la página entera": "Ver a página inteira",
  "Mostrar los paneles": "Mostrar os painéis",

  // formulario.tsx
  "Combinación {n}": "Combinação {n}",
  "La de la tienda": "A da loja",
  "Sin relleno": "Sem preenchimento",
  "Admite HTML: <p>, <strong>, <em>, <a>.": "Aceita HTML: <p>, <strong>, <em>, <a>.",
  "Admite <strong> y <em>.": "Aceita <strong> e <em>.",
  "No se pudo subir ({x}).": "Não foi possível enviar ({x}).",
  "Elegir video": "Escolher vídeo",
  "Elegir imagen": "Escolher imagem",
  "Subiendo...": "Enviando...",
  "Subir": "Enviar",
  "Sacar": "Remover",
  "MP4 o WebM.": "MP4 ou WebM.",
  "Imagen del campo {x}": "Imagem do campo {x}",
  "Nombre del campo personalizado": "Nome do campo personalizado",
  "Nombre del campo, ej.: foto_extra": "Nome do campo, ex.: foto_extra",
  "Usar un campo personalizado del producto": "Usar um campo personalizado do produto",
  "Un campo de tipo Imagen con Lectura pública (Configuración > Campos personalizados).": "Um campo do tipo Imagem com Leitura pública (Configurações > Campos personalizados).",
  "Buscando...": "Buscando...",
  "Sin resultados.": "Nenhum resultado.",
  "Falta el permiso de productos: reinstalá la app.": "Falta a permissão de produtos: reinstale o aplicativo.",
  "No se pudo buscar.": "Não foi possível buscar.",
  // La biblioteca de medios (formulario.tsx, 25-oct). [VERIFICAR] contra el admin de Nuvemshop en pt.
  "O elegí de la biblioteca": "Ou escolha da biblioteca",
  "Seleccionar archivo": "Selecionar arquivo",
  "Arrastrá o hacé clic para agregar imágenes": "Arraste ou clique para adicionar imagens",
  "Todavía no hay imágenes en tu biblioteca.": "Ainda não há imagens na sua biblioteca.",
  "No se pudo leer la biblioteca ({x}).": "Não foi possível ler a biblioteca ({x}).",
};
