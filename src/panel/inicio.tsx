/**
 * Las pantallas del panel fuera del editor, con las plantillas de Nimbus que pide la homologación de Tiendanube: el inicio
 * (como la página "Diseño" del admin, desde donde se abre el editor a pantalla completa) y la de error.
 */
import type { ReactNode } from "react";
import { Box, Button, Card, Icon, Link, Tag, Text, Title } from "@nimbus-ds/components";
import { EmptyMessage, HelpLink, Layout, Page } from "@nimbus-ds/patterns";
import { EditIcon, ExclamationTriangleIcon, ExternalLinkIcon, LayoutIcon, MarketingIcon, RedoIcon } from "@nimbus-ds/icons";
import type { Config } from "../config.ts";
import { t } from "./textos.ts";

declare const SOPORTE: string;

/**
 * El banner de promoción del inicio: ninguno por ahora. El de TicketUp vuelve cuando TicketUp esté publicada en la Tienda
 * de Aplicaciones (Gero, 25-oct): { titulo, texto, boton, url }, con su traducción en textos.ts.
 */
const PROMO: { titulo: string; texto: string; boton: string; url: string } | null = null;

const Ayuda = () => (
  <Box marginTop="4">
    <HelpLink>
      <Text>{t("¿Dudas? Escribinos a")} <Link as="a" href={`mailto:${SOPORTE}`} appearance="primary">{SOPORTE}</Link></Text>
    </HelpLink>
  </Box>
);

/** El encabezado de Nimbus con el ícono de la app (la serpiente de Gadsden, /icono.svg) a la izquierda del título. */
const Encabezado = (props: { title: string; subtitle?: string; buttonStack?: ReactNode }) => (
  <Box display="flex" alignItems="flex-start" paddingLeft="6" paddingTop="4">
    <img src="/icono.svg" alt="" width={48} height={48} style={{ borderRadius: 10, flexShrink: 0 }} />
    <Box flex="1"><Page.Header {...props} paddingLeft="4" paddingTop="none" /></Box>
  </Box>
);

/** El fondo del admin, con scroll propio (el editor deja el body sin scroll). */
const Fondo = ({ children }: { children: ReactNode }) => (
  <Box backgroundColor="neutral-surface" height="100vh" overflowY="auto">{children}</Box>
);

export function Inicio({ cfg, alEditar }: { cfg: Config; alEditar: () => void }) {
  const visibles = cfg.widgets.filter((w) => !w.oculto).length;
  const ocultos = cfg.widgets.length - visibles;
  const editar = <Button appearance="primary" onClick={alEditar}><Icon source={<EditIcon />} color="currentColor" />{t("Editar widgets")}</Button>;
  return (
    <Fondo>
      <Page maxWidth="800px">
        <Encabezado title="Gadsden Widgets" subtitle={t("Ofertas, adicionales, regalos, reseñas y popups en tu tienda, sin tocar código.")} buttonStack={editar} />
        <Page.Body>
          <Layout columns="1">
            <Layout.Section>
              {PROMO && (
                <Card backgroundColor="primary-surface">
                  <Box display="flex" gap="4" alignItems="flex-start">
                    <Icon source={<MarketingIcon size="medium" />} color="primary-textLow" />
                    <Box display="flex" flexDirection="column" gap="2">
                      <Title as="h4">{t(PROMO.titulo)}</Title>
                      <Text>{t(PROMO.texto)}</Text>
                      <Link as="a" href={PROMO.url} target="_blank" rel="noopener" appearance="primary">{t(PROMO.boton)}<Icon source={<ExternalLinkIcon />} color="currentColor" /></Link>
                    </Box>
                  </Box>
                </Card>
              )}
              {visibles + ocultos === 0 ? (
                <Card>
                  <EmptyMessage
                    icon={<LayoutIcon size={32} />}
                    title={t("Todavía no agregaste widgets")}
                    text={t("Abrí el editor, elegí un lugar de tu tienda y agregá el primero. Lo ves al instante y se publica cuando tocás Guardar y publicar.")}
                    actions={<Button appearance="primary" onClick={alEditar}>{t("Agregar mi primer widget")}</Button>}
                  />
                </Card>
              ) : (
                <Card>
                  <Card.Header title={t("Tus widgets")} />
                  <Card.Body>
                    <Box display="flex" flexDirection="column" gap="4">
                      <Box display="flex" gap="2" flexWrap="wrap">
                        <Tag appearance="success">{t(visibles === 1 ? "{n} publicado" : "{n} publicados", { n: visibles })}</Tag>
                        {ocultos > 0 && <Tag appearance="neutral">{t(ocultos === 1 ? "{n} oculto" : "{n} ocultos", { n: ocultos })}</Tag>}
                      </Box>
                      <Text>{t("Para agregar, mover o cambiar widgets, abrí el editor: es igual al de Editar diseño de Tiendanube.")}</Text>
                    </Box>
                  </Card.Body>
                  <Card.Footer>{editar}</Card.Footer>
                </Card>
              )}
            </Layout.Section>
          </Layout>
          <Ayuda />
        </Page.Body>
      </Page>
    </Fondo>
  );
}

export function PantallaError({ motivo }: { motivo: string }) {
  return (
    <Fondo>
      <Page maxWidth="800px">
        <Encabezado title="Gadsden Widgets" />
        <Page.Body>
          <Card>
            <EmptyMessage
              icon={<ExclamationTriangleIcon size={32} />}
              title={t("No pudimos abrir Gadsden Widgets")}
              text={motivo}
              actions={<Button appearance="primary" onClick={() => location.reload()}><Icon source={<RedoIcon />} color="currentColor" />{t("Recargar")}</Button>}
            />
          </Card>
          <Ayuda />
        </Page.Body>
      </Page>
    </Fondo>
  );
}
