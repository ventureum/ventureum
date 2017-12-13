Contract ProjectMetaWithVTH is ProjectMeta {

    VTHManager public _VTHManager;

    // VTH token contract address
    ERC20 public VTHToken;

    // ventureum meta contract
    Ventureum public ven;

    function ProjectMetaWithVTH(string name) ProjectMeta(name) {}

    function setVTHManager(address addr) external {
        _VTHManager = VTHManager(addr);
    }

    function setVTHToken(address addr) external {
        VTHToken = ERC20(addr);
    }

    function setVentureum(address addr) external {
        ven = Ventureum(addr);
    }
}
