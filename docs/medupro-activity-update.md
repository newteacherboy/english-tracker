Activity buttons use pastel toy cards and one shared transparent 3D sprite atlas. Original bottom navigation is unchanged. Parkur/MeduPro tabs have map/book artwork and descriptions.

medupro-api adds authenticated aktifDurum and takipDavetListesi routes. Heartbeats update only the signed-in portal session, at most once per 55 seconds; the visible client requests them every minute. Online requires an unexpired student session seen within five minutes. Invite lists come from server-side follow events and exclude blocked pairs. Only public name, class and recent presence are returned.

Two-player activity buttons open the following list with online-first ordering, name search and live/async choice. Blocking remains server-enforced and the smaller button appears beneath the profile follow button. Help explains direct invitations and online status.

Validation: syntax checks, authenticated actor binding regression tests, presence boundary/expired session/block/following tests, real authenticated API fixture (4-minute presence), and 360/390px hosted UI checks of invitations, tabs and block controls. Temporary QA accounts were removed. Main diji-api is unchanged.
