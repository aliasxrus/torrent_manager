const config = require('../../config');
const apiTorrent = require('./api/torrent');
const log = require('./log');

const version = (clientName) => {
    const reg = clientName.match(/(\d{1,2})\.(\d{1,2})\.(\d{1,2})/g);
    if (!reg) return [0, 0];
    const mm = Array.from(reg)[0].split('.').map(e => parseInt(e));
    return [mm[0], mm[1]];
}

let blockedIp = [];

const mu = config.filters.mu;
const bit = config.filters.bit;
const muMac = config.filters.muMac;
const filterMuMac = peer => peer.client.startsWith('μTorrent Mac') && peer.version[0] >= muMac.major && peer.version >= muMac.minor;
const filterMu = peer => (peer.client.startsWith('μTorrent') || peer.client.startsWith('µTorrent')) && peer.version[0] >= mu.major && peer.version[1] >= mu.minor;
const filterBit = peer => peer.client.startsWith('BitTorrent') && peer.version[0] >= bit.major && peer.version[1] >= bit.minor;
// const filterFake = peer => peer.client.startsWith('[FAKE]');

const blockPeers = async (peers) => {
    if (blockedIp.length > 100000) blockedIp = [];

    peers.forEach(peer => {
        if (!filterMu(peer) &&
            !filterBit(peer) &&
            !filterMuMac(peer) &&
            // !filterFake(peer) &&
            !blockedIp.includes(peer.ip)
        ) {
            log.info(`${new Date().toLocaleString()}:\tBlock`, peer.ip, peer.client);
            addIpToFilter(peer.ip);
            blockedIp.push(peer.ip);
        }
    });

    await apiTorrent.requestWithToken(`${config.apiTorrentUrl}:${config.port}/gui/?action=setsetting&s=ipfilter.enable&v=1`);
};

const scan = async () => {
    let peers = await apiTorrent.getPeers();
    peers = peers.filter(Array.isArray).flat().map(peer => {
        const client = peer[5].trim();
        return {ip: peer[1], utp: peer[3], client, version: version(client)}
    });
    await blockPeers(peers);
}

module.exports = {
    scan,
};
