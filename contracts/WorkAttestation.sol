// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";
import {Base64} from "@openzeppelin/contracts/utils/Base64.sol";
import {Strings} from "@openzeppelin/contracts/utils/Strings.sol";

/// @title WorkAttestation
/// @notice Permissionless soulbound ERC-721 attestations for paid freelance work.
contract WorkAttestation is ERC721 {
    using Strings for uint256;

    error ZeroAddress();
    error SelfAttestation();
    error ZeroAmount();
    error EmptyTitle();
    error TitleTooLong();
    error SoulboundToken();
    error TokenDoesNotExist();
    error NotFreelancer();
    error AlreadyAccepted();
    error AlreadyRejected();

    enum AttestationStatus {
        Pending,
        Accepted,
        Rejected
    }

    event AttestationPending(
        uint256 indexed tokenId,
        address indexed employer,
        address indexed freelancer,
        uint256 claimedUsdcAmount,
        string title
    );

    event WorkAttested(
        uint256 indexed tokenId,
        address indexed employer,
        address indexed freelancer,
        uint256 claimedUsdcAmount,
        string title
    );

    event AttestationRejected(uint256 indexed tokenId, address indexed employer, address indexed freelancer);

    struct Attestation {
        address employer;
        address freelancer;
        uint256 claimedUsdcAmount;
        string title;
        uint64 completedAt;
        string ipfsHash;
    }

    /// @custom:storage-location erc7201:proofofwork.workattestation.storage
    struct WorkAttestationStorage {
        uint256 nextTokenId;
        mapping(uint256 => Attestation) attestations;
        mapping(address => uint256[]) attestationsByFreelancer;
        mapping(address => uint256[]) attestationsByEmployer;
        mapping(address => uint256) totalEarnings;
        mapping(address => uint256[]) pendingAttestations;
        mapping(uint256 => uint256) pendingIndex;
        mapping(uint256 => AttestationStatus) attestationStatus;
    }

    bytes32 private constant _WORK_ATTESTATION_STORAGE_LOCATION =
        0x7487ae9d79a7a648eeef3750674f8fe5793b278fd56f6b66bfc993b66f175300;

    /// @notice Creates the Work Attestation collection.
    constructor() ERC721("Work Attestation", "WORK") {
        _getWorkAttestationStorage().nextTokenId = 1;
    }

    /// @notice Creates a pending attestation for paid freelance work.
    /// @dev The claimed USDC amount is an employer-asserted claim, not verified on-chain — it reflects the amount
    /// the employer claims to have paid off-chain or via a separate transaction.
    /// @param freelancer Recipient freelancer that must accept or reject the pending attestation.
    /// @param claimedUsdcAmount Claimed USDC amount (6-decimal units), asserted by the employer and not verified on-chain.
    /// @param title Job title or short description (1..100 chars).
    /// @param ipfsHash Optional IPFS hash with extra off-chain details.
    /// @return tokenId Newly created pending attestation id.
    function attest(
        address freelancer,
        uint256 claimedUsdcAmount,
        string calldata title,
        string calldata ipfsHash
    ) external returns (uint256 tokenId) {
        if (freelancer == address(0)) revert ZeroAddress();
        if (freelancer == msg.sender) revert SelfAttestation();
        if (claimedUsdcAmount == 0) revert ZeroAmount();

        uint256 titleLength = bytes(title).length;
        if (titleLength == 0) revert EmptyTitle();
        if (titleLength > 100) revert TitleTooLong();

        WorkAttestationStorage storage $ = _getWorkAttestationStorage();

        tokenId = $.nextTokenId;
        $.nextTokenId = tokenId + 1;

        uint64 completedAt = uint64(block.timestamp);

        $.attestations[tokenId] = Attestation({
            employer: msg.sender,
            freelancer: freelancer,
            claimedUsdcAmount: claimedUsdcAmount,
            title: title,
            completedAt: completedAt,
            ipfsHash: ipfsHash
        });

        $.pendingAttestations[freelancer].push(tokenId);
        $.pendingIndex[tokenId] = $.pendingAttestations[freelancer].length - 1;
        $.attestationStatus[tokenId] = AttestationStatus.Pending;

        emit AttestationPending(tokenId, msg.sender, freelancer, claimedUsdcAmount, title);
    }

    /// @notice Accepts a pending attestation and mints the soulbound NFT.
    /// @param tokenId Pending attestation id.
    function acceptAttestation(uint256 tokenId) external {
        WorkAttestationStorage storage $ = _getWorkAttestationStorage();
        _revertIfTokenIdNeverCreated($, tokenId);

        AttestationStatus status = $.attestationStatus[tokenId];
        if (status == AttestationStatus.Accepted) revert AlreadyAccepted();
        if (status == AttestationStatus.Rejected) revert AlreadyRejected();

        Attestation storage data = $.attestations[tokenId];
        if (msg.sender != data.freelancer) revert NotFreelancer();

        _removePendingAttestation(data.freelancer, tokenId);

        $.attestationStatus[tokenId] = AttestationStatus.Accepted;
        $.attestationsByFreelancer[data.freelancer].push(tokenId);
        $.attestationsByEmployer[data.employer].push(tokenId);
        $.totalEarnings[data.freelancer] += data.claimedUsdcAmount;

        _safeMint(data.freelancer, tokenId);

        emit WorkAttested(tokenId, data.employer, data.freelancer, data.claimedUsdcAmount, data.title);
    }

    /// @notice Rejects a pending attestation and deletes its stored data.
    /// @param tokenId Pending attestation id.
    function rejectAttestation(uint256 tokenId) external {
        WorkAttestationStorage storage $ = _getWorkAttestationStorage();
        _revertIfTokenIdNeverCreated($, tokenId);

        AttestationStatus status = $.attestationStatus[tokenId];
        if (status == AttestationStatus.Accepted) revert AlreadyAccepted();
        if (status == AttestationStatus.Rejected) revert AlreadyRejected();

        Attestation storage data = $.attestations[tokenId];
        if (msg.sender != data.freelancer) revert NotFreelancer();

        address employer = data.employer;
        address freelancer = data.freelancer;

        _removePendingAttestation(freelancer, tokenId);

        delete $.attestations[tokenId];
        $.attestationStatus[tokenId] = AttestationStatus.Rejected;

        emit AttestationRejected(tokenId, employer, freelancer);
    }

    /// @notice Returns full attestation data for a token id.
    /// @dev The claimed USDC amount is an employer-asserted claim, not verified on-chain — it reflects the amount
    /// the employer claims to have paid off-chain or via a separate transaction.
    /// @param tokenId Attestation token id.
    /// @return employer Employer that issued the attestation.
    /// @return freelancer Freelancer that received the attestation.
    /// @return claimedUsdcAmount Claimed USDC amount (6-decimal units), asserted by the employer and not verified on-chain.
    /// @return title Job title / description.
    /// @return completedAt Unix timestamp when attested.
    /// @return ipfsHash Optional IPFS hash with additional details.
    function getAttestation(
        uint256 tokenId
    )
        external
        view
        returns (
            address employer,
            address freelancer,
            uint256 claimedUsdcAmount,
            string memory title,
            uint64 completedAt,
            string memory ipfsHash
        )
    {
        WorkAttestationStorage storage $ = _getWorkAttestationStorage();
        Attestation storage data = $.attestations[tokenId];

        if (data.freelancer == address(0)) revert TokenDoesNotExist();

        return (
            data.employer,
            data.freelancer,
            data.claimedUsdcAmount,
            data.title,
            data.completedAt,
            data.ipfsHash
        );
    }

    /// @notice Returns all accepted attestation token ids received by a freelancer.
    /// @param freelancer Freelancer address.
    function getAttestationsByFreelancer(address freelancer) external view returns (uint256[] memory) {
        return _getWorkAttestationStorage().attestationsByFreelancer[freelancer];
    }

    /// @notice Returns all pending attestation token ids awaiting freelancer action.
    /// @param freelancer Freelancer address.
    function getPendingAttestationsByFreelancer(address freelancer) external view returns (uint256[] memory) {
        return _getWorkAttestationStorage().pendingAttestations[freelancer];
    }

    /// @notice Returns all accepted attestation token ids issued by an employer.
    /// @param employer Employer address.
    function getAttestationsByEmployer(address employer) external view returns (uint256[] memory) {
        return _getWorkAttestationStorage().attestationsByEmployer[employer];
    }

    /// @notice Returns cumulative claimed USDC amount for accepted attestations for a freelancer.
    /// @dev The amount is an employer-asserted claim, not verified on-chain — it reflects the amounts employers claim
    /// to have paid off-chain or via separate transactions.
    /// @param freelancer Freelancer address.
    function getTotalEarnings(address freelancer) external view returns (uint256) {
        return _getWorkAttestationStorage().totalEarnings[freelancer];
    }

    /// @notice Returns the status of an attestation id.
    /// @param tokenId Attestation token id.
    function getAttestationStatus(uint256 tokenId) external view returns (AttestationStatus) {
        WorkAttestationStorage storage $ = _getWorkAttestationStorage();
        _revertIfTokenIdNeverCreated($, tokenId);
        return $.attestationStatus[tokenId];
    }

    /// @notice Returns on-chain base64-encoded JSON metadata for an accepted attestation NFT.
    /// @dev The claimed USDC amount is an employer-asserted claim, not verified on-chain — it reflects the amount
    /// the employer claims to have paid off-chain or via a separate transaction.
    /// @param tokenId Attestation token id.
    function tokenURI(uint256 tokenId) public view override returns (string memory) {
        if (_ownerOf(tokenId) == address(0)) revert TokenDoesNotExist();

        WorkAttestationStorage storage $ = _getWorkAttestationStorage();
        Attestation storage data = $.attestations[tokenId];

        string memory titleEscaped = _escapeJSON(data.title);
        string memory ipfsEscaped = _escapeJSON(data.ipfsHash);

        string memory json = string(
            abi.encodePacked(
                '{"name":"Work Attestation #',
                tokenId.toString(),
                '","description":"Onchain proof of completed freelance work with employer-asserted payment claims.",',
                '"attributes":[',
                '{"trait_type":"Employer","value":"',
                _toHexString(data.employer),
                '"},',
                '{"trait_type":"Freelancer","value":"',
                _toHexString(data.freelancer),
                '"},',
                '{"trait_type":"Claimed USDC Amount (6 decimals)","value":"',
                data.claimedUsdcAmount.toString(),
                '"},',
                '{"trait_type":"Completed At","value":"',
                uint256(data.completedAt).toString(),
                '"},',
                '{"trait_type":"Title","value":"',
                titleEscaped,
                '"}',
                '],',
                '"employer":"',
                _toHexString(data.employer),
                '",',
                '"freelancer":"',
                _toHexString(data.freelancer),
                '",',
                '"claimedUsdcAmount":"',
                data.claimedUsdcAmount.toString(),
                '",',
                '"title":"',
                titleEscaped,
                '",',
                '"completedAt":',
                uint256(data.completedAt).toString(),
                ',"ipfsHash":"',
                ipfsEscaped,
                '"}'
            )
        );

        return string(abi.encodePacked("data:application/json;base64,", Base64.encode(bytes(json))));
    }

    /// @dev Enforces soulbound behavior by allowing only mint operations.
    function _update(address to, uint256 tokenId, address auth) internal override returns (address) {
        if (_ownerOf(tokenId) != address(0)) revert SoulboundToken();
        return super._update(to, tokenId, auth);
    }

    function _removePendingAttestation(address freelancer, uint256 tokenId) private {
        WorkAttestationStorage storage $ = _getWorkAttestationStorage();
        uint256[] storage pending = $.pendingAttestations[freelancer];
        uint256 idx = $.pendingIndex[tokenId];
        uint256 last = pending.length - 1;
        if (idx != last) {
            uint256 lastTokenId = pending[last];
            pending[idx] = lastTokenId;
            $.pendingIndex[lastTokenId] = idx;
        }
        pending.pop();
        delete $.pendingIndex[tokenId];
    }

    function _revertIfTokenIdNeverCreated(WorkAttestationStorage storage $, uint256 tokenId) private view {
        if (tokenId == 0 || tokenId >= $.nextTokenId) revert TokenDoesNotExist();
    }

    function _getWorkAttestationStorage() private pure returns (WorkAttestationStorage storage $) {
        bytes32 position = _WORK_ATTESTATION_STORAGE_LOCATION;
        assembly {
            $.slot := position
        }
    }

    function _toHexString(address account) private pure returns (string memory) {
        return Strings.toHexString(uint160(account), 20);
    }

    function _escapeJSON(string memory value) private pure returns (string memory) {
        bytes memory input = bytes(value);
        bytes memory output = new bytes(input.length * 6);
        uint256 outLen;

        for (uint256 i = 0; i < input.length; ++i) {
            bytes1 char = input[i];

            if (char == 0x22) {
                output[outLen++] = 0x5c;
                output[outLen++] = 0x22;
            } else if (char == 0x5c) {
                output[outLen++] = 0x5c;
                output[outLen++] = 0x5c;
            } else if (char == 0x08) {
                output[outLen++] = 0x5c;
                output[outLen++] = 0x62;
            } else if (char == 0x0c) {
                output[outLen++] = 0x5c;
                output[outLen++] = 0x66;
            } else if (char == 0x0a) {
                output[outLen++] = 0x5c;
                output[outLen++] = 0x6e;
            } else if (char == 0x0d) {
                output[outLen++] = 0x5c;
                output[outLen++] = 0x72;
            } else if (char == 0x09) {
                output[outLen++] = 0x5c;
                output[outLen++] = 0x74;
            } else if (uint8(char) < 0x20) {
                output[outLen++] = 0x5c;
                output[outLen++] = 0x75;
                output[outLen++] = 0x30;
                output[outLen++] = 0x30;

                uint8 high = uint8(char) >> 4;
                uint8 low = uint8(char) & 0x0f;
                output[outLen++] = bytes1(high + (high < 10 ? 48 : 87));
                output[outLen++] = bytes1(low + (low < 10 ? 48 : 87));
            } else {
                output[outLen++] = char;
            }
        }

        bytes memory trimmed = new bytes(outLen);
        for (uint256 i = 0; i < outLen; ++i) {
            trimmed[i] = output[i];
        }

        return string(trimmed);
    }
}
