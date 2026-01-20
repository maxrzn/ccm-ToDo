'use strict';

ccm.files['ccm.todo.js'] = {
    name: 'todo',
    ccm: '././libs/ccm/ccm.js',
    config: {
        user : [
            "ccm.start",
            "https://ccmjs.github.io/akless-components/user/versions/ccm.user-9.7.0.js",
        ],
        cat: ['ccm.store', {
            name: "mziege2s_categories",
            url: "wss://ccm2.inf.h-brs.de"
        }],
        task: ['ccm.store', {
            name: "mziege2s_tasks",
            url: "wss://ccm2.inf.h-brs.de"
        }],
        userInfo: ['ccm.store', {
            name: "mziege2s_userInfo",
            url: "https://ccm2.inf.h-brs.de"
        }],
        reward: ['ccm.store', {
            name: "mziege2s_rewards",
            url: "https://ccm2.inf.h-brs.de"
        }],
        html: ['ccm.load', '././resources/templates.html'],
        css: ['ccm.load', '././resources/styles.css']
    },

    Instance: function () {
        this.init = async () => {
            this.user.onchange = this.start;
        }

        this.start = async()=> {
            await this.user.login();
            const userId = this.user.getUsername();

            //listen on cat dataset
            this.cat.onchange = async(dataset) => {
                console.log(dataset);
                const isMember = dataset.members.some(m => m === userId);
                const isOwner = dataset.ownerId === userId;
                console.log("member: " + isMember + " owner: " + isOwner);
                if(!isMember && !isOwner) return;   //return if change is irrelevant


            };
            /*let data;

            data = await this.cat.get();
            for (const d of data) await this.cat.del(d.key);

            data = await this.task.get();
            for (const d of data) await this.task.del(d.key);

            data = await this.userInfo.get();
            for (const d of data) await this.userInfo.del(d.key);

            data = await this.reward.get();
            for (const d of data) await this.reward.del(d.key);*/

            const userExists = await this.userInfo.get({userId:userId}); //check for existing categories
            if(userExists.length === 0) {
                await this.cat.set({    //create Default category
                    title: "Meine Aufgaben",
                    ownerId : userId,
                    members : []
                });
                await this.userInfo.set({  //create userInfo
                    userId: userId,
                    earnedPoints: 0,
                    spentPoints: 0
                });
            }
            //append header and view div
            this.element.innerHTML = "";
            this.element.appendChild((this.ccm.helper.html(this.html.header, {userId: userId, points:await this.getBalance(userId)})));
            this.element.querySelector("#coinSVG").appendChild(this.ccm.helper.html(this.html.coinSVG));
            this.view = document.createElement("div");
            this.view.id = "view";
            this.element.appendChild(this.view);

            //logout click listener
            this.element.querySelector("#logout").addEventListener("click", ()=>{this.user.logout()})
            //shop-stats view eventlistener
            this.element.querySelector("#switchViewButton").addEventListener("click", async()=> {await this.switchView("shopStats")});
            //tasks view eventlistener
            this.element.querySelector("#leftArrow").addEventListener("click",() => {this.switchView("tasks")});

            await this.switchView("tasks");
        }

        this.switchView = async(view) => {
            if(view === "tasks") {
                this.view.innerHTML = "";
                this.view.appendChild(this.ccm.helper.html(this.html.editMember, {userId: this.user.getUsername(), firstLetter: this.user.getUsername().charAt(0).toUpperCase()}))

                //svgs hinzufuegen.. workaround da sonst das html nicht richtig angezeigt wird
                const popupEl = this.element.querySelector("#popupEditMember");
                popupEl.querySelector(".addMemberButton").appendChild(this.ccm.helper.html(this.html.addMemberSVG));
                popupEl.querySelector("#closePopup").appendChild(this.ccm.helper.html(this.html.xSVG));

                this.view.appendChild(this.ccm.helper.html(this.html.main));
                await this.initTasks();
                this.updateHeader("tasks");
            } else if(view === "shopStats") {
                this.view.innerHTML = "";
                this.view.appendChild(this.ccm.helper.html(this.html.shopStats));
                await this.initShopStats();
                this.updateHeader("shopStats");
            }
        }

        /**
         * renders tasks view
         * @returns {Promise<void>}
         */
        this.initTasks = async() =>{
            const main = this.element.querySelector("#main");
            main.appendChild(this.ccm.helper.html(this.html.catArea));
            main.appendChild(this.ccm.helper.html(this.html.taskArea));
            const userId = this.user.getUsername();

            //show categories
            await this.showCategories();
            //select default category
            await this.selectCategory();

            //open Category creation box button
            this.element.querySelector("#newCatButton").addEventListener("click", (e) => {
                this.element.querySelector("#newCatBox").classList.toggle("hidden", false);
                this.element.querySelector("#catTitle").focus();
                e.target.disabled = true;
            });

            //enter event listener
            this.element.querySelector("#catTitle").addEventListener("keypress", (e) => {
                if (e.key==='Enter') this.element.querySelector("#createCat").click();
            });

            //create Category
            this.element.querySelector("#createCat").addEventListener("click", async () => {
                const title = this.element.querySelector("#catTitle").value;
                const newCat = await this.cat.set({    //create category
                    title: title,
                    ownerId : userId,
                    members : []
                });
                this.closeNewCatBox();
                await this.insertCategory(await this.cat.get(newCat));
                await this.selectCategory(newCat);
            });

            //cancel Category creation
            this.element.querySelector("#cancelCatCreation").addEventListener("click", () =>this.closeNewCatBox());
            this.closeNewCatBox = () => {
                console.log("cancel");
                this.element.querySelector("#newCatBox").classList.toggle("hidden", true);
                this.clearInputs();
                this.element.querySelector("#newCatButton").disabled = false;
            }

            //open new Task creation
            const newTaskButton = this.element.querySelector("#newTaskButton");
            const newTaskBox = this.element.querySelector('#newTaskBox');
            newTaskButton.addEventListener("click", () => {
                newTaskButton.disabled = true;
                newTaskBox.classList.remove("hidden");
                newTaskBox.querySelector("#taskContent").focus();
            });

            //create new Task
            const createTaskButton = this.element.querySelector("#createTaskButton");
            const inputFields = this.element.querySelectorAll("#newTaskBox input");
            inputFields.forEach((input) => {
                input.addEventListener("keypress", (e) => {
                    if (e.key==='Enter') createTaskButton.click();
                });
            });
            createTaskButton.addEventListener("click", async() => {
                const categoryId = this.element.querySelector("#categoryList .selected").id;
                const newTask = await this.task.set({
                    content: this.element.querySelector("#taskContent").value,
                    deadline: this.element.querySelector("#taskDeadline").value,
                    points: this.element.querySelector("#taskPoints").value,
                    status: "open",
                    categoryId: categoryId,
                    userId: userId
                });
                newTaskBox.classList.add("hidden");
                newTaskButton.disabled = false;
                this.clearInputs();
                //show updated Tasklist
                this.insertOpenTask(await this.task.get(newTask))
                await this.updateTaskCount(categoryId);
            });

            //cancel Task creation
            const cancelTaskButton = this.element.querySelector('#cancelTaskButton');
            cancelTaskButton.addEventListener("click", () => {
                newTaskBox.classList.add("hidden");
                newTaskButton.disabled = false;
                this.clearInputs();
            });
            //close member popup
            this.element.querySelector("#closePopup").addEventListener("click", () => {
                this.element.querySelector("#overlay").classList.toggle("hidden", true);
                this.element.querySelector(".searchMember").value = "";
            });
            //add memberButton
            this.element.querySelector(".addMemberButton").addEventListener("click", async() => {
                const InputEl = this.element.querySelector(".searchMember");
                const member = InputEl.value;
                const categoryId = this.element.querySelector("#categoryList .selected").id;
                const cat = await this.cat.get(categoryId);

                const exists = await this.userInfo.get({userId: member}); //search for user
                console.log(cat.members);
                if(exists.length === 0) {    //user not found
                    InputEl.focus();
                    InputEl.value = "";
                    return alert("Benutzer nicht gefunden");
                } else if(cat.members.some(m => m === member) || member === cat.ownerId) { //user is already member
                    InputEl.focus();
                    InputEl.value = "";
                    return alert("Benutzer ist bereits Mitglied der Kategorie");
                }
                //add member
                const updatedMembers = [...cat.members, member];
                await this.cat.set({key: categoryId, members: updatedMembers});
                this.insertMember(cat.ownerId, member);
                InputEl.value = "";
            })
            //add enter eventlistener
            this.element.querySelector(".searchMember").addEventListener("keypress", (e) => {
                if (e.key === "Enter") this.element.querySelector(".addMemberButton").click();
            });

            //clear history Button
            const clearHistoryButton = this.element.querySelector("#clearHistoryButton");
            clearHistoryButton.addEventListener("click", async() =>  {
                const categoryList = this.element.querySelector("#categoryList");
                const categoryId = categoryList.querySelector(".selected").id;
                await this.deleteTasks(categoryId, "closed");
            });
        }
        /**
         * initializes shop & statistics site view
         * @returns {Promise<void>}
         */
        this.initShopStats = async() => {
            const view2 = document.createElement("div");
            view2.id = "view2";
            this.element.querySelector("#view").appendChild(view2);
            this.switchView2("shop");
        }
        this.switchView2 = (view) => {
            if(view === "shop") {
                this.initShop();
            }
        }
        this.initShop = async() => {
            const view2 = this.element.querySelector("#view2");
            view2.appendChild(this.ccm.helper.html(this.html.shop));
            const newRewardBox = this.element.querySelector("#newRewardBox");
            const openRewardCreation = this.element.querySelector("#openRewardCreation");
            //clear reward history
            this.element.querySelector("#clearRewardHistory").addEventListener("click", async() => {
                const rewards = await this.reward.get({status: "closed"});
                console.log(rewards);
                for (const reward of rewards) {
                    await this.reward.del(reward.key);
                }
                this.element.querySelector("#rewardHistoryList").innerHTML = "";
                this.updateNoRewardInfo();
            });
            //open reward creation
            openRewardCreation.addEventListener("click", (e) => {
                e.target.disabled = true;
                newRewardBox.classList.remove("hidden");
            });
            //cancel reward creation
            this.element.querySelector("#cancelRewardButton").addEventListener("click",()=> {this.resetNewRewardBox();});

            //iconpicker eventlisteners
            const icons = this.element.querySelectorAll(".iconBox");
            icons.forEach((icon) => {
               icon.addEventListener("click", (e) => {
                   this.element.querySelector(".iconBox.selected").classList.remove("selected");
                   e.target.classList.add("selected");
               });
            });

            //newRewardBox Enter eventlistener
            newRewardBox.addEventListener("keypress", (e) => {
                if (e.key === "Enter") {
                    this.element.querySelector("#createRewardButton").click();
                }
            });

            //create reward
            this.element.querySelector("#createRewardButton").addEventListener("click", async() => {
                const rewardData = {
                    title: this.element.querySelector("#rewardNameInput").value,
                    icon: this.element.querySelector(".iconBox.selected").textContent,
                    cost: this.element.querySelector("#rewardCost").value,
                    ownerId: this.user.getUsername(),
                    status: "open"
                };
                this.reward.set(rewardData);
                this.resetNewRewardBox();
                await this.insertOpenReward(rewardData);
            });

            //show all rewards
            await this.showAllRewards();
        };
        
        /**
         * shows all categories which userId owns or is a member of
         * @returns {Promise<void>}
         */
        this.showCategories = async() => {
            const userId = this.user.getUsername();
            const cats = await this.cat.get({
                $or: [
                    {ownerId: userId},
                    {members: userId}
                ]
            });
            for (const cat of cats) {
                await this.insertCategory(cat);
            }
        }

        /**
         * inserts a single cat element into div #categoryList
         * @param cat category object from database
         * @returns {Promise<void>}
         */
        this.insertCategory = async(cat) => {
            const taskCount = (await this.task.get({userId: this.user.getUsername(), categoryId : cat.key, status:"open"})).length;
            const newCat = this.ccm.helper.html(this.html.category, {categoryKey:cat.key ,title:cat.title, taskCount:taskCount });
            if(cat.title === "Meine Aufgaben") {
                newCat.querySelector(".catStandard").classList.remove("hidden");
                newCat.querySelector(".catButtons").remove();
                /*newCat.classList.add("selected");*/
                newCat.classList.add("default");
            } else {
                //members button listener
                newCat.querySelector(".group").addEventListener("click", async(e) => {
                    const categoryEl = e.target.closest("div[id]");
                    this.element.querySelector("#overlay").classList.toggle("hidden", false);
                    console.log(categoryEl.id);
                    await this.showMembers(await this.cat.get(categoryEl.id));
                })
                //delete Category listener
                newCat.querySelector(".delete").addEventListener("click", async(e) => {
                    console.log("trash");
                    const categoryElement = e.target.closest("div[id]");
                    await this.deleteCategory(categoryElement.id);
                    categoryElement.remove();
                    await this.selectCategory();
                });
            }
            //select Category listener
            newCat.addEventListener("click", (e) => this.selectCategory(e));
            const categoryList = this.element.querySelector("#categoryList");
            if(cat.title === "Meine Aufgaben") {   //insert default as first element
                categoryList.prepend(newCat);
            } else {                        //insert after default child
                const first = categoryList.firstChild;
                if(first && first.nextSibling) {
                    categoryList.insertBefore(newCat, first.nextSibling);
                } else {
                    categoryList.appendChild(newCat);
                }
            }


        }

        this.selectCategory = async(e) => {
            console.trace("select");
            let target;
            if(e && e.target) {//called from click event
                target = e.target.closest(".category");
            } else if (e instanceof HTMLElement) {
                target = e;
            } else { //called manually -> select first category in categorylist
                target = this.element.querySelector("#categoryList > .category");
            }
            if(target.classList.contains("selected")) return; //category already Selected
            this.element.querySelector("#newTaskBox").classList.toggle("hidden", true);//close task creation window if necessary
            this.element.querySelector("#newTaskButton").disabled = false; //enable button
            this.highlightCategory(target);
            await this.showTasks(target.id);
        }

        this.showMembers = async(cat) => {
            this.element.querySelector("#memberList").innerHTML = "";
            //insert owner
            this.insertMember(cat.ownerId, cat.ownerId);
            console.log(cat.members);
            //insert members
            if(cat.members.length > 0) {
                cat.members.forEach((username) => {this.insertMember(cat.ownerId, username);});
            }
        }
        this.insertMember = (ownerId, username) => {
            const memberList = this.element.querySelector("#memberList");
            const memberEl = this.ccm.helper.html(this.html.member, {userId: username, firstLetter: username[0].toUpperCase()});

            //append svgs (workaround)
            memberEl.querySelector(".deleteMember").appendChild(this.ccm.helper.html(this.html.xSVG));

            //customize member element if inserted member is the owner
            if(ownerId === username) {
                memberEl.querySelector(".deleteMember").classList.add("hidden");
                const tag = document.createElement("p");
                tag.classList.add("tag");
                tag.textContent = "Eigentümer";
                memberEl.querySelector(".memberInfo").appendChild(tag);
            } else if (ownerId !== this.user.getUsername()) {  //remove delete member buttons if youre not the owner
                memberEl.querySelector(".deleteMember").classList.add("hidden");
            } else {
                memberEl.querySelector(".deleteMember").addEventListener("click", async(e) => {
                    const catKey = this.element.querySelector("#categoryList .selected").id;
                    const memberEl = e.target.closest(".member");
                    const memberName = memberEl.querySelector(".memberName").textContent;
                    const cat = await this.cat.get(catKey);
                    const updatedMembers = cat.members.filter(member => member !== memberName);
                    console.log(updatedMembers);
                    await this.cat.set({key: catKey, members: updatedMembers});
                    memberEl.remove();
                });
            }
            memberList.appendChild(memberEl);
        }

        /**
         * iterates through tasks list, shows open tasks and completed task
         * @returns {Promise<void>}
         */
        this.showTasks = async(categoryKey) => {
            const categoryName = (await this.cat.get(categoryKey)).title;
            const tasks = await this.task.get({categoryId: categoryKey });
            this.element.querySelector("#categoryTitle").innerHTML = categoryName; //change category name
            this.element.querySelector("#taskList").innerHTML = "";
            this.element.querySelector("#taskHistory").innerHTML = "";
            if(tasks.length) {
                tasks.sort((a,b) => new Date(a.updated_at) - new Date(b.updated_at));
                tasks.forEach((task) => {
                    if(task.status==="open") {
                        this.insertOpenTask(task);

                    } else {
                        this.insertCompletedTask(task);
                    }
                });
            }
            this.updateHistoryVisibility();
            this.updateNoTaskInfo();
        }
        /**
         * inserts completed task into taskList div
         * @param task task object
         */
        this.insertOpenTask = (task) => {
            const taskList = this.element.querySelector("#taskList");
            const taskDeadline = task.deadline ? new Date(task.deadline).toLocaleDateString("De-de") : "";
            const taskel = this.ccm.helper.html(this.html.task, {
                taskContent: task.content,
                taskPoints: task.points ?? "",
                taskDeadline: taskDeadline
            });
            //remove icons if not needed
            if(!task.points)  {
                taskel.querySelector(".taskPoints").remove();
            } else {    //insert trophy Svg
                const trophy = this.ccm.helper.html(this.html.trophySVG);
                taskel.querySelector(".trophyIcon").appendChild(trophy);
            }
            if(!task.deadline) {
                taskel.querySelector(".taskDeadline").remove();
            } else {    //insert calender svg
                const calendar = this.ccm.helper.html(this.html.calendarSVG);
                taskel.querySelector(".calendarIcon").appendChild(calendar);
            }

            taskel.setAttribute("id", task.key);
            //deleteTask Button
            taskel.querySelector(".deleteTaskButton").addEventListener("click", async (e) => {
                const taskDiv = e.target.closest("div[id]");
                taskDiv.remove();
                const categoryId = (await this.task.get(taskDiv.getAttribute("id"))).categoryId;
                await this.task.del(taskDiv.getAttribute("id"));
                this.updateNoTaskInfo();
                await this.updateTaskCount(categoryId);
                //TODO trigger tasklist refresh for other participants if needed
            });
            //completeTask Button
            taskel.querySelector(".completeTaskButton").addEventListener("click", async (e) => {
                const taskHistory = this.element.querySelector("#taskHistory");
                const taskDiv = e.target.closest("div[id]");
                taskDiv.remove();
                const taskKey = taskDiv.getAttribute("id");
                this.task.set({key : taskKey, status : 'closed' });
                const task = await this.task.get(taskKey);
                await this.updatePoints(Number(task.points));
                this.insertCompletedTask(task);
                this.updateNoTaskInfo();
                this.updateHistoryVisibility();
                await this.updateTaskCount(task.categoryId);
                //TODO trigger tasklist refresh for other participants if needed
            })
            taskList.prepend(taskel);
            this.updateNoTaskInfo();
        }
        /**
         * inserts completed task as first Child of taskHistory div
         * @param task task object
         */
        this.insertCompletedTask = (task) => {
            const taskHistory = this.element.querySelector("#taskHistory");
            taskHistory.classList.toggle("hidden", false);
            const points = task.points ? "+" + task.points + " Punkte" : "";
            const completedDate = new Date(task.updated_at).toLocaleDateString("de-DE");
            const taskel = this.ccm.helper.html(this.html.completedTask, {
                completedContent: task.content,
                points: points,
                completedDate:  completedDate
            });
            taskel.setAttribute("id", task.key);
            taskHistory.prepend(taskel);
        }

        /**
         * inserts all existing rewards into #rewardList
         * @returns {Promise<void>}
         */
        this.showAllRewards = async() => {
            const rewards = await this.reward.get({
                ownerId: this.user.getUsername(),
            });
            if(!rewards.length) {
                this.updateNoRewardInfo();
                return;
            }
            rewards.sort((a,b) => new Date(a.updated_at) - new Date(b.updated_at));
            this.element.querySelector("#rewardList").innerHTML = "";
            rewards.forEach((reward) => {
                console.log(reward);
                reward.status === "open" ? this.insertOpenReward(reward) : this.insertClosedReward(reward);
            });

            //delete reward eventlisteners
            const rewardsEl = this.element.querySelectorAll(".deleteRewardButton");
            rewardsEl.forEach((el) => {
                el.addEventListener("click", async(e) => {
                    const rewardEl = e.target.closest(".reward-row");
                    await this.reward.del(rewardEl.id);
                    rewardEl.remove();
                });
            });
            //buy reward eventlisteners
            const buyRewardsEl = this.element.querySelectorAll(".buyRewardButton");
            buyRewardsEl.forEach((el) => {
                el.addEventListener("click", async(e) => {
                    const rewardEl = e.target.closest(".reward-row");
                    await this.reward.set({key : rewardEl.id, status : 'closed' });
                    this.insertClosedReward(await this.reward.get(rewardEl.id));
                    rewardEl.remove();
                    const cost = rewardEl.querySelector(".rewardCost").textContent;
                    await this.updatePoints(Number(-cost));
                });
            });
            await this.updateRewardButtons();
        }
        this.resetNewRewardBox = () => {
            const newRewardBox = this.element.querySelector("#newRewardBox");
            newRewardBox.querySelector(".iconBox.selected").classList.remove("selected");
            newRewardBox.querySelector("#iconWrapper > span").classList.toggle("selected", true);
            newRewardBox.querySelector("#rewardNameInput").value = "";
            newRewardBox.querySelector("#rewardCost").value = 20;
            this.element.querySelector("#openRewardCreation").disabled = false;
            newRewardBox.classList.add("hidden");
        }
        /**
         * inserts reward element into RewardList div
         * @param reward element
         */
        this.insertOpenReward = async (reward) => {
            const rewardList = this.element.querySelector("#rewardList");
            const rewardEl = this.ccm.helper.html(this.html.reward, {
                rewardIcon: reward.icon,
                rewardTitle: reward.title,
                rewardCost: reward.cost
            });
            rewardEl.id = reward.key;
            rewardList.prepend(rewardEl);
            this.updateNoRewardInfo();
            await this.updateRewardButtons()
        }
        this.insertClosedReward = (reward) => {
            const rewardHistoryList = this.element.querySelector("#rewardHistoryList");
            const rewardEl = this.ccm.helper.html(this.html.closedReward, {
                rewardIcon: reward.icon,
                rewardTitle: reward.title,
                rewardCost: reward.cost,
                completedDate: new Date(reward.updated_at).toLocaleDateString("de-DE")
            });
            rewardHistoryList.prepend(rewardEl);
            this.updateNoRewardInfo();
        }
        /**
         * updates points in database and display
         * @param points added amount of points
         * @returns {Promise<void>}
         */
        this.updatePoints = async(points) => {
            console.log(points);
            const entry = (await this.userInfo.get({userId: this.user.getUsername()}))[0];
            if(points>0) {
                await this.userInfo.set({
                    key: entry.key,
                    earnedPoints: entry.earnedPoints + points
                });
            } else {
                console.log("negative");
                await this.userInfo.set({
                    key: entry.key,
                    spentPoints: entry.spentPoints - points
                })
            }
            await this.updateBalanceDisplay();
        }

        this.updateNoTaskInfo = () => {
            const noTaskInfo = this.element.querySelector("#noTaskInfo");
            const taskList = this.element.querySelector("#taskList");
            noTaskInfo.classList.toggle("hidden", taskList.hasChildNodes());
        }
        this.updateNoRewardInfo = () => {
            const noRewardInfo = this.element.querySelector("#noRewardInfo");
            const rewardList = this.element.querySelector("#rewardList");
            noRewardInfo.classList.toggle("hidden", rewardList.hasChildNodes());

            const noRewardHistoryInfo = this.element.querySelector("#noRewardHistoryInfo");
            const rewardHistoryList = this.element.querySelector("#rewardHistoryList");
            noRewardHistoryInfo.classList.toggle("hidden", rewardHistoryList.hasChildNodes());
        }

        this.updateHistoryVisibility = () => {
            const history = this.element.querySelector("#historyArea");
            const t = this.element.querySelectorAll("#taskHistory .taskHistory-row");
            if (!history) return;
            history.classList.toggle("hidden", t.length === 0);
        }
        this.updateTaskCount = async (catId) => {
            const cat = await this.cat.get(catId);
            const taskCount = (await this.task.get({userId: this.user.getUsername(), categoryId : cat.key, status:"open"})).length;
            const catDiv = this.element.querySelector(`[id="${cat.key}"]`);
            catDiv.querySelector(".taskCount").innerHTML = taskCount + " Aufgaben";
        }
        this.highlightCategory = (target) => {
            const div = this.element.querySelector("#categoryList .selected");
            if(div) {
                div.classList.remove("selected");
                target.classList.add("selected");
            } else {
                this.element.querySelector("#categoryList .default").classList.add("selected");
            }
        }

        this.updateHeader = (view) => {
            this.element.querySelector("#switchViewButton").classList.toggle("hidden", view==="shopStats");
            this.element.querySelector("#greeting").classList.toggle("hidden", view==="shopStats");
            this.element.querySelector("#leftArrow").classList.toggle("hidden", view==="tasks");
            if(view === "tasks") {
                this.element.querySelector("#viewTitle").textContent = "To-Do Manager";
            } else if(view === "shopStats") {
                this.element.querySelector("#viewTitle").textContent = "Shop & Statistiken";
                document.createElement("button")
            }
        }

        this.clearInputs = () => {
            const input = this.element.querySelectorAll("input");
            input.forEach((i) => {
                i.value = "";
            });
        }
        this.updateBalanceDisplay = async() => {
            const balance = await this.getBalance(this.user.getUsername());
            console.log(balance);
            this.element.querySelector("#pointsDisplay").innerHTML = balance + " Punkte";
            await this.updateRewardButtons();
        }
        this.updateRewardButtons = async() => {
            const rewardButtons = this.element.querySelectorAll(".buyRewardButton");
            const balance = await this.getBalance(this.user.getUsername());
            console.log(rewardButtons);
            rewardButtons.forEach((button) => {
                const rewardCost = button.closest(".reward-row").querySelector(".rewardCost").textContent;
                console.log(balance + " costs" + rewardCost);
                if(balance < Number(rewardCost)) {
                    button.disabled = true;
                    button.classList.toggle("active", false);
                } else {
                    button.disabled = false;
                    button.classList.toggle("active", true);
                }
            });
        }
        this.getBalance = async(userId) => {
            return (await this.userInfo.get({userId:userId}))[0].earnedPoints - (await this.userInfo.get({userId:userId}))[0].spentPoints;
        }


        this.deleteAllCategories = async() => {
            const cats = await this.cat.get();
            cats.forEach((element) => {
                this.cat.del(element.key);
                console.log("Category: " + element.key + " wurde ausradiert!");
            });
        }
        /**
         * deletes category and all its tasks
         * @param categoryId
         * @returns {Promise<void>}
         */
        this.deleteCategory = async(categoryId) => {
            await this.cat.del(categoryId);
            await this.deleteTasks(categoryId, "");
        }
        this.deleteTasks = async(categoryId, status) => {
            const query = {ownerId:this.user.getUsername(), categoryId:categoryId};
            if(status !== "") {query.status = status;}
            const tasks = await this.task.get(query);
            console.log("tasks" + tasks);
            tasks.forEach(element => {
                this.task.del(element.key);
                console.log("Task: " + element.key + " wurde ausradiert!");
            });
            if(status === "closed") {
                const t = this.element.querySelectorAll("#taskHistory .taskHistory-row");
                t.forEach((t) => t.remove());
                this.updateHistoryVisibility();
            }
        }

    },
}

//TODO grid layout for main areas, category height indepenent from task window height

