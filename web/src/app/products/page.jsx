import { requirePageAccess } from '@/lib/auth/guard';
import { navGroups } from '@/lib/auth/nav';
import { listProducts } from '@/lib/products/service';
import dash from '../dashboard/dashboard.module.css';
import Sidebar from '../dashboard/Sidebar';
import TopBar from '../dashboard/TopBar';
import DashFooter from '../dashboard/DashFooter';
import ProductsClient from './ProductsClient';

export default async function ProductsPage() {
  // Server-side check: typing /products without the "products" right redirects to /dashboard.
  // /api/products runs the same check again.
  const user = await requirePageAccess('products');

  // The service decides what each role receives: Admins get all rows plus Status/Stamp,
  // a User gets Active rows with four columns only. Every row already carries its current price.
  const rows = await listProducts(user);
  const isAdmin = user.role !== 'user';

  // Buttons only (Add / Edit / Delete / Prices dialog are built in the next tickets). Admins see all of them.
  // For a User, replace this with however guard.ts exposes per-action rights (prod:a / prod:e / prod:d).
  const has = (key) => isAdmin || Boolean(user.rights?.has?.(key));
  const perm = { add: has('prod:a'), edit: has('prod:e'), del: has('prod:d') };

  return (
    <div className={dash.shell}>
      <div className={dash.orbs} aria-hidden="true">
        <i className={dash.stars} />
        <b className={dash.o1} />
        <b className={dash.o2} />
        <b className={dash.o3} />
      </div>

      <Sidebar groups={navGroups(user)} active="products" />

      <main className={dash.main}>
        <TopBar
          title="Product Management"
          role={user.role}
          roleLabel={user.roleLabel}
          firstName={user.firstName}
          email={user.email}
        />
        <ProductsClient initial={rows} isAdmin={isAdmin} perm={perm} />
        <DashFooter />
      </main>
    </div>
  );
}