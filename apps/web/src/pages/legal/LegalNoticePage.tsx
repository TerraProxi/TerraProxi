import { MainLayout } from '../../components/layout/MainLayout'

/** RGPD-3 — mentions légales (LCEN, art. 6). */
export function LegalNoticePage() {
  return (
    <MainLayout>
      <article className="tp-prose" style={{ maxWidth: 820 }}>
        <h1 style={{ fontSize: 'var(--text-3xl)' }}>Mentions légales</h1>

        <h2>Éditeur</h2>
        <p>
          TerraProxi — projet du Cycle d'Innovation Digitale, EPSI Montpellier (projet 2427-25).<br />
          Équipe : Gaëtan Faucher, Théo Freihuber, Dunvael Le Roux, Mylo Wierez.<br />
          Contact : <a href="mailto:contact@terraproxi.fr">contact@terraproxi.fr</a>
        </p>
        <p>Directeur de la publication : Gaëtan Faucher.</p>

        <h2>Hébergement</h2>
        <p>OVH SAS — 2 rue Kellermann, 59100 Roubaix, France — www.ovhcloud.com</p>

        <h2>Rôle de la plateforme</h2>
        <p>
          TerraProxi met en relation des consommateurs et des producteurs locaux. Chaque producteur est le vendeur
          des produits qu'il publie et reste responsable de leur description, de leur prix et de leur conformité.
          Les paiements sont traités par Stripe Payments Europe Ltd.
        </p>

        <h2>Propriété intellectuelle</h2>
        <p>
          Le nom, le logo et les contenus de TerraProxi appartiennent à l'équipe du projet. Les photos et textes
          publiés par les producteurs restent leur propriété.
        </p>

        <h2>Données personnelles</h2>
        <p>Voir la <a href="/privacy">politique de confidentialité</a>.</p>
      </article>
    </MainLayout>
  )
}
