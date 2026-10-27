import Agenda from "@/components/Agenda";
import CoinCA from "@/components/CoinCA";
import LawnGame from "@/components/LawnGame";
import OrderDesk from "@/components/OrderDesk";
import PressBriefing from "@/components/PressBriefing";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import Ticker from "@/components/Ticker";

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <CoinCA />
        <LawnGame />
        <Ticker />
        <Agenda />
        <OrderDesk />
        <PressBriefing />
      </main>
      <SiteFooter />
    </>
  );
}
