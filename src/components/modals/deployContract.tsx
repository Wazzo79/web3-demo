import * as ipfsClient from "ipfs-http-client";
import { AddIcon, DeleteIcon } from "@chakra-ui/icons";
import {
    Modal,
    ModalOverlay,
    ModalContent,
    ModalHeader,
    ModalFooter,
    ModalBody,
    ModalCloseButton,
    Button,
    useDisclosure,
    VStack,
    FormControl,
    FormLabel,
    Input,
    Textarea,
    Select,
    HStack,
    Divider,
    IconButton,
    useToast,
    Box,
    Center,
    Spinner,
} from '@chakra-ui/react';
import { useEffect, useRef, useState } from "react";
import Web3 from "web3";

const auth = "Basic " + Buffer.from("2E1YT7m56EQsEiS1iVtRpQiUpiP" + ":" + "10848d2b54384a58e650039d7f2fde33").toString("base64");

const ipfs = ipfsClient.create({ host: "ipfs.infura.io", port: 5001, protocol: "https", headers: { authorization: auth } });

declare let window: any;
let web3: Web3;

interface IAttribute {
    trait_type: string;
    value: string;
}

interface IArtistSplit {
    address: string;
    share: number | undefined;
}


export const DeployContract = (props: any) => {
    const { isOpen, onOpen, onClose } = useDisclosure();
    const [artist, setArtist] = useState("");
    let attributes: IAttribute[] = [];
    const [artistSplits, setArtistSplits] = useState<IArtistSplit[]>([]);
    const [artistAddress, setArtistAddress] = useState("");
    const [artistShare, setArtistShare] = useState<number>();
    const [audio, setAudio] = useState<File>();
    const [description, setDescription] = useState("");
    const [image, setImage] = useState<File>();
    const [loading, setLoading] = useState<boolean>();
    const [name, setName] = useState("");
    const [videoSource, setVideoSource] = useState("");
    const [uploadFile, setUploadFile] = useState<File>();
    const [ipfsFileUrl, setIpfsFileUrl] = useState("");
    const [account, setAccount] = useState("");
    const [factoryContract, setFactoryContract] = useState<any>();
    const [maxCopies, setMaxCopies] = useState<number>(50);
    const [managingAddress, setManagingAddress] = useState("");
    const [mintCost, setMintCost] = useState<number>(0.1);
    const [royalty, setRoyalty] = useState<number>(10);
    const [deployedNFTContract, setDeployedNftContractContract] = useState("");
    const [deployedSplitterContract, setDeployedSplitterContract] = useState("");
    const [factoryAddress, setFactoryAddress] = useState("0x67Ec2287ff825eA0004bdf44Ce15569F8926ba64");
    const [platformAddress, setPlatformAddress] = useState("0x57fcF301dAd7631d9BDD81e73316a606CF3a9893");
    const [paymentContractAddress, setPaymentContractAddress] = useState("0x356c11Baa5286D36001DF1396005B2aA51fcA750");

    const [albumName, setAlbumName] = useState("");
    const [trackType, setTrackType] = useState("Single");

    const fileArtworkRef = useRef(null);
    const fileAudioRef = useRef(null);
    const toast = useToast();

    useEffect(() => {
        onConnect();
    }, []);

    useEffect(() => { }, [ipfsFileUrl]);

    useEffect(() => { }, [attributes]);

    const clearAll = () => {
        attributes = [];
        setArtistSplits([]);
        if (fileAudioRef.current) (fileAudioRef.current as any).value = null;
        setArtist("");
        setMaxCopies(50);
        setMintCost(0.1);
        setDescription("");
        setRoyalty(10);
        if (fileArtworkRef.current) (fileArtworkRef.current as any).value = null;
        setLoading(false);
        setName("");
        setVideoSource("");
        setUploadFile(undefined);
        setIpfsFileUrl("");
    };

    const create = async () => {
        if (artistSplits.length === 0) {
            toast({
                title: "Error",
                description: "You need to define creator split in order to be paid ongoing royalties.",
                status: "error",
                duration: 9000,
                isClosable: true,
            });
            return;
        }
        if (artistSplits.map((m) => m.address).some((s) => s == platformAddress)) {
            toast({
                title: "Error",
                description: "Artist address cannot be the same as platform address",
                status: "error",
                duration: 9000,
                isClosable: true,
            });
            return;
        }
        setLoading(true);
        const contentUrl = await uploadContentFileToIPFS();
        const metadataUrl = await createNFTJson(contentUrl);
        await deploy(metadataUrl);
        setLoading(false);
    };

    const createVideo = async () => {
        try {
            setLoading(true);
            const formData = new FormData();

            formData.append("audio", (fileAudioRef.current as any).files[0]);
            formData.append("image", (fileArtworkRef.current as any).files[0]);
            formData.append("fileName", name);

            const res = await fetch("http://35.173.75.195:8080/api/v1/make", {
                method: "POST",
                body: formData,
            });

            const fileBlob = await res.blob();

            var video = document.getElementsByTagName("video")[0];
            let objectURL = URL.createObjectURL(fileBlob);
            video.src = objectURL;

            let file = new File([fileBlob], `${name}.mp4`);

            setUploadFile(file);
            setVideoSource(URL.createObjectURL(fileBlob));

            setLoading(false);
        }
        catch
        {
            setLoading(false);
        }
    };


    const detectCurrentProvider = () => {
        let provider;
        if (window.ethereum) {
            provider = window.ethereum;
        } else if (window.web3) {
            provider = window.web3.currentProvider;
        } else {
            console.log("Non-Ethereum browser detected. You should consider trying MetaMask!");
        }
        return provider;
    };

    const onConnect = async () => {
        try {
            const currentProvider = detectCurrentProvider();
            if (currentProvider) {
                if (currentProvider !== window.ethereum) {
                    console.log("Non-Ethereum browser detected. You should consider trying MetaMask!");
                }
                await currentProvider.request({ method: "eth_requestAccounts" });
                web3 = new Web3(currentProvider);

                const userAccount = await web3.eth.getAccounts();
                setAccount(userAccount[0]);
                setManagingAddress(userAccount[0]);

                const factoryAbi = require('abis/abiFactory.json');
                var contract = new web3.eth.Contract(factoryAbi, factoryAddress);
                setFactoryContract(contract);

                window.ethereum.on("accountsChanged", function (accounts: any) {
                    accounts[0] === undefined ? setAccount("") : setAccount(accounts[0]);
                });
            }
        } catch (err) {
            console.log("There was an error fetching your accounts. Make sure your Ethereum client is configured correctly.");
        }
    };

    const deploy = async (metadataUrl: string | undefined) => {
        let royaltyMod = royalty * 100;
        let artistAddresses = artistSplits.map((m) => m.address);
        artistAddresses.push(platformAddress);
        let artistShares = artistSplits.map((m) => m.share! * 100);
        let totalShare: any = artistShares.reduce((a: any, b: any) => a + b);
        let index = 500 / royaltyMod;
        let platformShare = totalShare * index;
        artistShares.push(platformShare);
        royaltyMod += 500;

        debugger;
        let contractUri = await factoryContract.methods
            .deploy(managingAddress, royaltyMod.toString(), artistAddresses, artistShares, metadataUrl, maxCopies, web3.utils.toWei(mintCost.toString()), paymentContractAddress)
            .send({ from: account });

        if (contractUri !== undefined) {
            setDeployedNftContractContract(contractUri.events[0].address);
            setDeployedSplitterContract(contractUri.events[1].address);
        }
    };

    const handleArtistSplitChange = () => {
        let tempArtistSplit: IArtistSplit = { address: artistAddress, share: artistShare };
        setArtistSplits([...artistSplits, tempArtistSplit]);

        setArtistAddress("");
        setArtistShare(0);
    };

    const addAttribute = (name: string, value: string) => {
        let tempAttribute: IAttribute = { trait_type: name, value: value };
        attributes = [...attributes, tempAttribute];
    };

    const removeArtistSplit = (index: number) => {
        let tempArr = [...artistSplits];
        tempArr.splice(index, 1);

        setArtistSplits(tempArr);
        setArtistAddress("");
        setArtistShare(1);
    };

    const handleImageChange = async (e: any) => {
        let file = e.target.files[0];
        setImage(file);
        if (audio) {
            createVideo();
        }
    };

    const handleAudioChange = (e: any) => {
        let file = e.target.files[0];
        setAudio(file);
        if (image) {
            createVideo();
        }
    };

    const uploadContentFileToIPFS = async () => {
        try {
            if (uploadFile !== undefined) {
                setLoading(true);
                let filePath = (await ipfs.add(uploadFile)).path;
                setLoading(false);
                return filePath;
            }
        }
        catch
        {
            setLoading(false);
        }
    };

    const createNFTJson = async (contentUrl: string | undefined) => {
        try {
            setLoading(true);

            addAttribute("Artist(s)", artist);
            addAttribute("Track Type", trackType);
            if (trackType !== "Single") {
                addAttribute(trackType, albumName);
            }
            addAttribute("Maximum Copies", `${maxCopies.toString()}`);

            const jsn = JSON.stringify({
                description: description,
                image: `https://demoverse.infura-ipfs.io/ipfs/${contentUrl}`,
                name: name,
                attributes: attributes,
            });

            const blob = new Blob([jsn], { type: "application/json" });
            const file = new File([blob], "file.json");

            const fileAdded = await ipfs.add(file);
            setLoading(false);
            return `https://demoverse.infura-ipfs.io/ipfs/${fileAdded.path}`;
        }
        catch
        {
            setLoading(false);
        }
    };

    return (
        <>
            <Button onClick={onOpen} margin={3} title='Deploy a Contract'>+</Button>

            <Modal isOpen={isOpen} onClose={onClose} isCentered>
                <ModalOverlay />
                <ModalContent>
                    <ModalHeader>Deploy NFT Contract</ModalHeader>
                    <ModalCloseButton />
                    <ModalBody>
                        <VStack>
                            <FormControl isRequired>
                                <FormLabel>Track Owner</FormLabel>
                                <Input type="text" disabled onChange={(e: any) => setManagingAddress(e.target.value)} value={managingAddress} placeholder="Managing Address" />
                            </FormControl>
                            <FormControl isRequired>
                                <FormLabel>Track Title</FormLabel>
                                <Input type="text" onChange={(e: any) => setName(e.target.value)} value={name} placeholder="Title" />
                            </FormControl>
                            <FormControl isRequired>
                                <FormLabel>Track Description</FormLabel>
                                <Textarea onChange={(e: any) => setDescription(e.target.value)} value={description} placeholder="Description" />
                            </FormControl>
                            <FormControl isRequired>
                                <FormLabel>Artist(s)</FormLabel>
                                <Input type="text" onChange={(e: any) => setArtist(e.target.value)} value={artist} placeholder="Artist(s)" />
                            </FormControl>
                            <FormControl isRequired>
                                <FormLabel>Maximum copies to release</FormLabel>
                                <Input type="number" onChange={(e: any) => setMaxCopies(e.target.value)} value={maxCopies} placeholder="e.g. 50" />
                            </FormControl>

                            <FormControl isRequired>
                                <FormLabel>Track Type</FormLabel>
                                <Select value={trackType} onChange={(e) => setTrackType(e.target.value)}>
                                    <option value="Single">Single</option>
                                    <option value="Album">Album</option>
                                    <option value="EP">EP</option>
                                </Select>
                            </FormControl>
                            <FormControl hidden={trackType === "Single"}>
                                <FormLabel>Album/EP Name</FormLabel>
                                <Input placeholder="Album/EP Name" onChange={(e) => setAlbumName(e.target.value)} />
                            </FormControl>

                            <HStack width="100%">
                                <FormControl isRequired>
                                    <FormLabel>Mint Cost (ETH)</FormLabel>
                                    <Input type="number" onChange={(e: any) => setMintCost(e.target.value)} value={mintCost} placeholder="e.g. 0.1" />
                                </FormControl>
                                <FormControl isRequired>
                                    <FormLabel>Royalty (%)</FormLabel>
                                    <Input type="number" min="5" max="30" onChange={(e: any) => setRoyalty(e.target.value)} value={royalty} placeholder="e.g. 10" />
                                </FormControl>
                            </HStack>
                            <FormControl>
                                <FormLabel>Upload Artwork</FormLabel>
                                <Input pl="1" pt="1" ref={fileArtworkRef} type="file" accept="image/*" onChange={handleImageChange} />
                            </FormControl>
                            <FormControl>
                                <FormLabel>Upload Audio</FormLabel>
                                <Input pl="1" pt="1" type="file" ref={fileAudioRef} onChange={handleAudioChange} />
                            </FormControl>
                            <Divider></Divider>
                            <HStack>
                                <FormControl>
                                    <FormLabel>Creator Address</FormLabel>
                                    <Input type="text" placeholder="Address" onChange={(e) => setArtistAddress(e.target.value)} value={artistAddress} />
                                </FormControl>
                                <FormControl>
                                    <FormLabel>Creator Share</FormLabel>
                                    <Input type="number" placeholder="Value" onChange={(e) => setArtistShare(parseInt(e.target.value))} value={artistShare} />
                                </FormControl>
                                <IconButton
                                    aria-label=""
                                    icon={<AddIcon />}
                                    alignSelf="flex-end"
                                    onClick={() => handleArtistSplitChange()}
                                />
                            </HStack>
                            {artistSplits.map((artistSplit: IArtistSplit, index) => (
                                <HStack key={index}>
                                    <FormControl>
                                        <Input disabled type="text" placeholder="Address" value={artistSplit.address} />
                                    </FormControl>
                                    <FormControl>
                                        <Input disabled type="number" placeholder="Share" value={artistSplit.share} />
                                    </FormControl>
                                    <IconButton aria-label="" icon={<DeleteIcon />} alignSelf="flex-end" onClick={() => removeArtistSplit(index)} disabled={videoSource !== ""} />
                                </HStack>
                            ))}

                            <Divider></Divider>
                            <Box>
                                <Center>
                                    <Spinner hidden={!loading}></Spinner>
                                    <video controls autoPlay preload="auto" width="300px" height="300px" hidden={videoSource == ""}></video>
                                </Center>
                            </Box>
                        </VStack>
                    </ModalBody>

                    <ModalFooter>
                        <Center>
                            <Button onClick={() => create()} disabled={videoSource === "" || deployedNFTContract !== ""}>
                                {loading ? <Spinner /> : "Create Contract"}
                            </Button>
                        </Center>
                    </ModalFooter>
                </ModalContent>
            </Modal>
        </>
    )
}