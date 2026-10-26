/**
 * Las cadenas de interfaz que los widgets de Gadsden piden con `t` y que en el theme vienen de las traducciones de Dawn
 * (licencia de Shopify): acá van escritas de nuevo. Las de Gadsden (`gadsden.*`) salen de vendor/gadsden/config.
 */
export const TEXTOS = {
  accessibility: { close: "Cerrar" },
  customer: { order: { discount: "Descuento" } },
  general: { slider: { next_slide: "Siguiente", previous_slide: "Anterior" } },
  localization: { language_label: "Idioma" },
  newsletter: { button_label: "Suscribirme", label: "Correo electrónico", success: "¡Gracias por suscribirte!" },
  products: {
    product: {
      add_to_cart: "Agregar al carrito", on_sale: "Oferta", sold_out: "Agotado", value_unavailable: "{{ option_value }} - No disponible",
      quantity: { label: "Cantidad", decrease: "Restar", increase: "Sumar" },
      price: { regular_price: "Precio habitual", sale_price: "Precio de oferta", from_price_html: "Desde {{ price }}" },
    },
  },
  sections: {
    cart: {
      checkout: "Finalizar compra", estimated_total: "Total estimado", note: "Nota del pedido",
      taxes_at_checkout_shipping_at_checkout_without_policy: "Impuestos, descuentos y envío calculados al finalizar la compra.",
      taxes_included_shipping_at_checkout_without_policy: "Impuestos incluidos. Envío calculado al finalizar la compra.",
      duties_and_taxes_included_shipping_at_checkout_without_policy: "Impuestos incluidos. Envío calculado al finalizar la compra.",
      duties_included_taxes_at_checkout_shipping_at_checkout_without_policy: "Impuestos y envío calculados al finalizar la compra.",
    },
    footer: { payment: "Medios de pago" },
  },
  templates: { contact: { form: { comment: "Comentario", email: "Correo electrónico", name: "Nombre", phone: "Teléfono", send: "Enviar" } } },
};
