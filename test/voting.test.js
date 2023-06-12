const Voting = artifacts.require("./Voting.sol");
const { BN , expectRevert, expectEvent } = require('@openzeppelin/test-helpers');
const { expect } = require('chai');

contract("Voting", accounts => {

    const _owner = accounts[0];
    const _voter1 = accounts[1];
    const _voter2 = accounts[2];

    let Votinginstance;
    
    describe("Test registration", function() {
        beforeEach(async function(){
            Votinginstance = await Voting.new({from: _owner});
        });

        it ("should verify require not passing", async () => {
            await Votinginstance.startProposalsRegistering({from: _owner});
            await expectRevert(Votinginstance.addVoter(_voter1, {from: _owner}), 'Voters registration is not open yet');
        });

        it ("should be add to the list of voter", async () => {
            await Votinginstance.addVoter(_owner, {from: _owner});
            await Votinginstance.addVoter(_voter1, {from: _owner});
            const voter = await Votinginstance.getVoter(_voter1);
            await expect(voter.isRegistered).to.be.true;
        });

        it ("shouldn't be able to add several time the same voter", async () => {
            await Votinginstance.addVoter(_owner, {from: _owner});
            await expectRevert(Votinginstance.addVoter(_owner, {from: _owner}), 'Already registered');
        });

        it ("should verify event", async () => {
            await expectEvent(await Votinginstance.addVoter(_owner, {from: _owner}), "VoterRegistered", {voterAddress: _owner});
        });
    });

    describe("Test proposal", function() {
        beforeEach(async function(){
            Votinginstance = await Voting.new({from: _owner});
            await Votinginstance.addVoter(_owner, {from: _owner});
            await Votinginstance.addVoter(_voter1, {from: _owner});
            await Votinginstance.startProposalsRegistering({from: _owner});
        });

        it ("should verify voter can't be add anymore", async () => {
            await Votinginstance.endProposalsRegistering({from: _owner});
            await expectRevert(Votinginstance.addProposal("proposal Description", {from: _owner}), 'Proposals are not allowed yet');
        });

        it ("should add a proposal", async () => {
            await Votinginstance.addProposal("proposal Description", {from: _owner});
            const proposal = await Votinginstance.getOneProposal(1);
            await expect(proposal.description).equal("proposal Description");
        });

        it ("Unregistred voter shouln't add proposal", async () => {
            await expectRevert(Votinginstance.addProposal("proposal Description", {from: _voter2}), "You're not a voter");
        });

        it ("Nothing shouln't be accepted as a proposal", async () => {
            await expectRevert(Votinginstance.addProposal("", {from: _voter1}), 'Vous ne pouvez pas ne rien proposer');
        });

        it ("should verify event", async () => {
            await expectEvent(await Votinginstance.addProposal("proposal Description", {from: _voter1}), "ProposalRegistered", {proposalId: new BN(1)});
        });
    });

    describe("Test vote", function() {
        beforeEach(async function(){
            Votinginstance = await Voting.new({from: _owner});
            await Votinginstance.addVoter(_owner, {from: _owner});
            await Votinginstance.addVoter(_voter1, {from: _owner});
            await Votinginstance.startProposalsRegistering({from: _owner});
            await Votinginstance.addProposal("proposal Description", {from: _owner});
            await Votinginstance.endProposalsRegistering({from: _owner});
            await Votinginstance.startVotingSession({from: _owner});
        });

        it ("should verify voter can't vote after the session ends", async () => {
            await Votinginstance.endVotingSession({from: _owner});
            await expectRevert(Votinginstance.setVote(new BN(1), {from: _voter1}), 'Voting session havent started yet');
        });

        it ("should verify that the vote is register", async () => {
            let proposal = await Votinginstance.getOneProposal(1);
            const countBeforeVote = proposal.voteCount;
            await Votinginstance.setVote(new BN(1), {from: _voter1});
            proposal = await Votinginstance.getOneProposal(1);
            const countAfterVote = proposal.voteCount;
            const voter = await Votinginstance.getVoter(_voter1, {from: _owner});

            await expect(voter.hasVoted).to.be.true;
            await expect(voter.votedProposalId).to.be.bignumber.equal(new BN(1));
            await expect(countBeforeVote).to.not.be.bignumber.equal(countAfterVote);
        });

        it ("shouldn't be able to vote twice", async () => {
            await Votinginstance.setVote(new BN(1), {from: _voter1});
            await expectRevert(Votinginstance.setVote(new BN(1), {from: _voter1}), 'You have already voted');
        });

        it ("ID shouldn't be out of bound", async () => {
            await expectRevert(Votinginstance.setVote(new BN(5), {from: _voter1}), 'Proposal not found');
        });

        it ("should verify event", async () => {
            await expectEvent(await Votinginstance.setVote(new BN(1), {from: _voter1}), "Voted", {voter: _voter1, proposalId: new BN(1)});
        });
    });

    describe("Test States changemeent", function() {
        beforeEach(async function(){
            Votinginstance = await Voting.new({from: _owner});
        });

        it ("should verify require of RegisteringVoter status", async () => {
            await expectRevert(Votinginstance.endProposalsRegistering({from: _owner}), 'Registering proposals havent started yet');
            await expectRevert(Votinginstance.startVotingSession({from: _owner}), 'Registering proposals phase is not finished');
            await expectRevert(Votinginstance.endVotingSession({from: _owner}), 'Voting session havent started yet');
            await expectRevert(Votinginstance.tallyVotes({from: _owner}), "Current status is not voting session ended");
        });

        it ("should verify require of ProposalsRegistrationStarted status", async () => {
            await Votinginstance.startProposalsRegistering({from: _owner});
            
            await expectRevert(Votinginstance.startProposalsRegistering({from: _owner}), 'Registering proposals cant be started now');
            await expectRevert(Votinginstance.startVotingSession({from: _owner}), 'Registering proposals phase is not finished');
            await expectRevert(Votinginstance.endVotingSession({from: _owner}), 'Voting session havent started yet');
            await expectRevert(Votinginstance.tallyVotes({from: _owner}), "Current status is not voting session ended");
            
        });

        it ("should verify require of ProposalsRegistrationEnded status", async () => {
            await Votinginstance.startProposalsRegistering({from: _owner});
            await Votinginstance.endProposalsRegistering({from: _owner});

            await expectRevert(Votinginstance.startProposalsRegistering({from: _owner}), 'Registering proposals cant be started now');
            await expectRevert(Votinginstance.endProposalsRegistering({from: _owner}), 'Registering proposals havent started yet');
            await expectRevert(Votinginstance.endVotingSession({from: _owner}), 'Voting session havent started yet');
            await expectRevert(Votinginstance.tallyVotes({from: _owner}), "Current status is not voting session ended");
        });

        it ("should verify require of VotingSessionStarted status", async () => {
            await Votinginstance.startProposalsRegistering({from: _owner});
            await Votinginstance.endProposalsRegistering({from: _owner});
            await Votinginstance.startVotingSession({from: _owner});

            await expectRevert(Votinginstance.startProposalsRegistering({from: _owner}), 'Registering proposals cant be started now');
            await expectRevert(Votinginstance.endProposalsRegistering({from: _owner}), 'Registering proposals havent started yet');
            await expectRevert(Votinginstance.startVotingSession({from: _owner}), 'Registering proposals phase is not finished');
            await expectRevert(Votinginstance.tallyVotes({from: _owner}), "Current status is not voting session ended");
        });

        it ("should verify require of VotingSessionEnded status", async () => {
            await Votinginstance.startProposalsRegistering({from: _owner});
            await Votinginstance.endProposalsRegistering({from: _owner});
            await Votinginstance.startVotingSession({from: _owner});
            await Votinginstance.endVotingSession({from: _owner})

            await expectRevert(Votinginstance.startProposalsRegistering({from: _owner}), 'Registering proposals cant be started now');
            await expectRevert(Votinginstance.endProposalsRegistering({from: _owner}), 'Registering proposals havent started yet');
            await expectRevert(Votinginstance.startVotingSession({from: _owner}), 'Registering proposals phase is not finished');
            await expectRevert(Votinginstance.endVotingSession({from: _owner}), 'Voting session havent started yet');
        });
    });

    describe("Test tally vote", function() {
        beforeEach(async function(){
            Votinginstance = await Voting.new({from: _owner});
            await Votinginstance.addVoter(_owner, {from: _owner});
            await Votinginstance.addVoter(_voter1, {from: _owner});
            await Votinginstance.startProposalsRegistering({from: _owner});
            await Votinginstance.addProposal("the GOAT", {from: _owner});
            await Votinginstance.endProposalsRegistering({from: _owner});
            await Votinginstance.startVotingSession({from: _owner});
            await Votinginstance.setVote(new BN(1), {from: _voter1});
            await Votinginstance.endVotingSession({from: _owner})
        });

        it ("should verify the winner", async () => {
            await Votinginstance.tallyVotes({from: _owner});
            let winnerId = await Votinginstance.winningProposalID.call();
            await expect(winnerId).to.be.bignumber.equal(new BN(1));
        });

        it ("should verify event", async () => {
            await expectEvent(await Votinginstance.tallyVotes({from: _owner}), "WorkflowStatusChange", {previousStatus: new BN(4), newStatus: new BN(5)});
        });
    });

});